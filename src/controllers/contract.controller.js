const asyncHandler = require('../utils/asyncHandler');
const contractService = require('../services/contract.service');
const rentalRequestService = require('../services/rentalRequest.service');
const propertyService = require('../services/property.service');
const { sendContractEmail, sendContractSignedEmail } = require('../services/email.service');
const { createAutomatedMessage } = require('../utils/message.utils');
const ApiError = require('../utils/ApiError');
const Notification = require('../models/Notification.model');

const markContractAsRented = async (contract) => {
  const requestId = contract.request?._id || contract.request;
  const propertyId = contract.property?._id || contract.property;

  if (!requestId || !propertyId) {
    return;
  }

  await rentalRequestService.updateRentalRequestStatus(requestId, 'Contrat actif');
  await propertyService.updatePropertyById(propertyId, { status: 'rented' });
};

// @desc    Générer un contrat à partir d'une demande
// @route   POST /api/contracts/generate
const generateContract = asyncHandler(async (req, res) => {
  const { requestId } = req.body;
  const request = await rentalRequestService.getRentalRequestById(requestId);

  if (!request) {
    throw new ApiError(404, 'Demande non trouvée');
  }

  // Vérifier que c'est bien le propriétaire (ou admin) qui génère le contrat
  if (request.property.owner._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ApiError(403, 'Accès refusé');
  }

  const existing = await contractService.getContractByRequestId(requestId);
  if (existing) {
    return res.send(existing);
  }

  const contractBody = {
    request: requestId,
    property: request.property._id,
    owner: request.property.owner._id,
    tenant: request.tenant._id,
    rentAmount: request.property.rent,
    depositAmount: request.property.rent * 2,
    status: 'Draft'
  };

  const contract = await contractService.createContract(contractBody);
  await rentalRequestService.updateRentalRequestStatus(requestId, 'Contrat généré');
  
  res.status(201).send(contract);
});

// @desc    Récupérer un contrat par l'ID de la demande
// @route   GET /api/contracts/request/:requestId
const getContract = asyncHandler(async (req, res) => {
  const contract = await contractService.getContractByRequestId(req.params.requestId);
  if (!contract) {
    throw new ApiError(404, 'Contrat non trouvé');
  }
  res.send(contract);
});

// @desc    Récupérer un contrat par son ID
// @route   GET /api/contracts/:contractId
const getContractById = asyncHandler(async (req, res) => {
  const contract = await contractService.getContractById(req.params.contractId);
  if (!contract) {
    throw new ApiError(404, 'Contrat non trouvé');
  }
  res.send(contract);
});

// @desc    Signer un contrat
// @route   PUT /api/contracts/:contractId/sign
const signContract = asyncHandler(async (req, res) => {
  const { contractId } = req.params;
  const { signature } = req.body;

  if (!signature) {
    throw new ApiError(400, 'Signature requise');
  }

  const updateBody = {};
  if (req.user.role === 'owner') {
    updateBody.ownerSignature = signature;
    updateBody.status = 'SignedByOwner';
  } else {
    updateBody.tenantSignature = signature;
    updateBody.status = 'SignedByTenant';
  }

  const contract = await contractService.updateContract(contractId, updateBody);

  if (req.user.role !== 'owner') {
    await markContractAsRented(contract);
  }

  // Send notification to owner when tenant signs
  if (req.user.role !== 'owner' && contract.status === 'SignedByTenant') {
    try {
        await Notification.create({
            recipient: contract.owner._id,
            type: 'Contrat',
            title: 'Contrat signé par le locataire',
            preview: `Le locataire a signé le contrat.`,
            content: `Le locataire a signé le contrat pour le bien ${contract.property?.title || 'votre bien'}. Vous pouvez maintenant l'activer.`,
            contractData: {
              contractId: contractId,
              requestId: contract.request?._id || contract.request,
              propertyTitle: contract.property?.title || 'Votre bien',
              propertyAddress: contract.property?.address || '',
              propertyImage: contract.property?.images?.cover || '',
              startDate: contract.startDate || '',
              endDate: contract.endDate || '',
              rent: contract.rentAmount || 0
            }
        });
        // Send email to owner
        await sendContractSignedEmail(contract.owner.email, {
          propertyTitle: contract.property?.title || 'Votre bien',
          propertyAddress: contract.property?.address || '',
          rent: contract.rentAmount || 0
        });
    } catch (err) { console.error("Notification error:", err); }
  }

  // Automated chat notification
  try {
    const isOwner = req.user.role === 'owner';
    const recipientId = isOwner ? (contract.tenant?._id || contract.tenant) : (contract.owner?._id || contract.owner);
    
    await createAutomatedMessage({
      senderId: req.user._id,
      recipientId: recipientId,
      contextId: contract.request?._id || contract.request,
      contextTitle: contract.property?.title || 'Contrat de location',
      content: `J'ai signé le contrat de location pour "${contract.property?.title || 'le bien'}". Veuillez le consulter.`,
      metadata: { contractId: contract._id, type: 'contract_signed' }
    });
  } catch (err) {
    console.error("Auto-message error in signContract:", err);
  }

  res.send(contract);
});

// @desc    Valider et Activer un contrat
// @route   PUT /api/contracts/:contractId/activate
const activateContract = asyncHandler(async (req, res) => {
  const { contractId } = req.params;
  const contract = await contractService.getContractById(contractId);

  if (!contract) {
    throw new ApiError(404, 'Contrat non trouvé');
  }

  // Seul le propriétaire peut activer
  if (contract.owner._id.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Seul le propriétaire peut activer le contrat');
  }

  if (contract.status !== 'SignedByTenant') {
    throw new ApiError(400, "Le locataire n'a pas encore signé le contrat");
  }

  const updatedContract = await contractService.updateContract(contractId, { status: 'SignedByBoth' });
  
  await rentalRequestService.updateRentalRequestStatus(contract.request, 'Contrat actif');
  await propertyService.updatePropertyById(contract.property, { status: 'rented' });

  // Automated chat notification when contract is activated
  try {
    await createAutomatedMessage({
      senderId: req.user._id,
      recipientId: contract.tenant._id,
      contextId: contract.request._id || contract.request,
      contextTitle: contract.property?.title || 'Contrat de location',
      content: `Félicitations ! Le contrat de location pour "${contract.property?.title || 'votre bien'}" a été activé. Bienvenue chez vous !`
    });
  } catch (err) {
    console.error("Auto-message error in activateContract:", err);
  }

  res.send(updatedContract);
});

// @desc    Envoyer le contrat au locataire
// @route   PUT /api/contracts/:contractId/send
const sendToTenant = asyncHandler(async (req, res) => {
  const { contractId } = req.params;
  const { message } = req.body;

  const contract = await contractService.updateContract(contractId, { 
    status: 'SentToTenant',
    tenantMessage: message
  });

  // Create notification for tenant when owner sends contract
  try {
    await Notification.create({
      recipient: contract.tenant._id,
      type: 'Contrat',
      title: 'Contrat de location à signer',
      preview: `Le propriétaire a signé et envoyé le contrat de location.`,
      content: `Le propriétaire a signé et envoyé le contrat de location. Veuillez le consulter et le signer.`,
      contractData: {
        contractId: contractId,
        requestId: contract.request?._id || contract.request,
        propertyTitle: contract.property?.title || 'Votre bien',
        propertyAddress: contract.property?.address || '',
        propertyImage: contract.property?.images?.cover || '',
        startDate: contract.startDate || '',
        endDate: contract.endDate || '',
        rent: contract.rentAmount || 0
      }
    });
  } catch (err) { 
    console.error("Notification error:", err); 
  }

  // Send email notification to tenant
  try {
    await sendContractEmail(contract.tenant.email, {
      propertyTitle: contract.property?.title || 'Votre bien',
      propertyAddress: contract.property?.address || '',
      rent: contract.rentAmount || 0
    });
  } catch (err) {
    console.error("Email error:", err);
  }

  // Automated chat notification when owner sends contract
  try {
    await createAutomatedMessage({
      senderId: req.user._id,
      recipientId: contract.tenant?._id || contract.tenant,
      contextId: contract.request?._id || contract.request,
      contextTitle: contract.property?.title || 'Contrat de location',
      content: message || "J'ai préparé et signé le contrat de location. Vous pouvez maintenant le consulter et le signer.",
      metadata: { contractId: contract._id, type: 'contract_sent' }
    });
  } catch (err) {
    console.error("Auto-message error in sendToTenant:", err);
  }

  res.send(contract);
});

// @desc    Renvoyer le contrat au propriétaire (après signature du locataire)
// @route   PUT /api/contracts/:contractId/send-back
const sendBackToOwner = asyncHandler(async (req, res) => {
  const { contractId } = req.params;
  const { message } = req.body;

  const contract = await contractService.getContractById(contractId);
  if (!contract) {
    throw new ApiError(404, 'Contrat non trouvé');
  }

  const updatedContract = await contractService.updateContract(contractId, { 
    status: 'SignedByTenant' 
  });

  await markContractAsRented(updatedContract);

  // Create notification for owner
  try {
    await Notification.create({
      recipient: contract.owner._id,
      type: 'Contrat',
      title: 'Contrat signé par le locataire',
      preview: `Le locataire a signé le contrat et vous l'a renvoyé.`,
      content: message || `Le locataire a signé le contrat pour le bien "${contract.property?.title}". Vous pouvez maintenant l'activer.`,
      contractData: {
        contractId: contractId,
        requestId: contract.request?._id || contract.request,
        propertyTitle: contract.property?.title || 'Votre bien',
        propertyAddress: contract.property?.address || '',
        propertyImage: contract.property?.images?.cover || '',
        startDate: contract.startDate || '',
        endDate: contract.endDate || '',
        rent: contract.rentAmount || 0
      }
    });
  } catch (err) { 
    console.error("Notification error in sendBackToOwner:", err); 
  }

  // Automated chat notification
  try {
    await createAutomatedMessage({
      senderId: req.user._id,
      recipientId: contract.owner._id,
      contextId: contract.request._id || contract.request,
      contextTitle: contract.property?.title || 'Contrat de location',
      content: message || "J'ai signé le contrat de location. Vous pouvez maintenant l'activer.",
      metadata: { contractId: contract._id, type: 'contract_signed_back' }
    });
  } catch (err) {
    console.error("Auto-message error in sendBackToOwner:", err);
  }

  res.send(updatedContract);
});

module.exports = {
  generateContract,
  getContract,
  getContractById,
  signContract,
  activateContract,
  sendToTenant,
  sendBackToOwner
};
