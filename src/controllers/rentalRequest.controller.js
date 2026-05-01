const asyncHandler = require('../utils/asyncHandler');
const rentalRequestService = require('../services/rentalRequest.service');
const ApiError = require('../utils/ApiError');
const Conversation = require('../models/Conversation.model');
const Message = require('../models/Message.model');
const Notification = require('../models/Notification.model');

const createRequest = asyncHandler(async (req, res) => {
  const requestBody = {
    ...req.body,
    tenant: req.user._id,
    date: new Date().toLocaleDateString('fr-FR'),
  };
  const request = await rentalRequestService.createRentalRequest(requestBody);
  res.status(201).send(request);
});

const getRequests = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.user.role === 'owner') {
    const Property = require('../models/Property.model');
    const ownerProperties = await Property.find({ owner: req.user._id }).select('_id');
    const propertyIds = ownerProperties.map((property) => property._id);
    filter.property = { $in: propertyIds };
  } else if (req.user.role === 'tenant') {
    filter.tenant = req.user._id;
  }

  const result = await rentalRequestService.queryRentalRequests(filter);
  res.send(result);
});

const updateRequestStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const requestId = req.params.requestId;

  const request = await rentalRequestService.getRentalRequestById(requestId);

  if (request.property.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ApiError(403, 'Forbidden');
  }

  const updatedRequest = await rentalRequestService.updateRentalRequestStatus(requestId, status);

  const conversation = await Conversation.findOne({
    contextId: String(requestId),
    participants: req.user._id,
  }).sort({ updatedAt: -1 });

  const normalizedStatus = String(status || '').toLowerCase();

  if (conversation) {
    let ownerMessage = null;

    if (normalizedStatus.includes('accept')) {
      ownerMessage = 'Votre demande a ete acceptee.';
    } else if (normalizedStatus.includes('refus')) {
      ownerMessage = 'Votre demande a ete refusee.';
    } else if (normalizedStatus.includes('gen') || normalizedStatus.includes('gener')) {
      ownerMessage = 'Le contrat a ete genere et est pret a etre consulte.';
    } else if (normalizedStatus.includes('actif') || normalizedStatus.includes('active')) {
      ownerMessage = 'Le contrat est desormais actif.';
    }

    if (ownerMessage) {
      const decisionMessage = await Message.create({
        conversation: conversation._id,
        sender: req.user._id,
        content: ownerMessage,
        source: 'platform',
        metadata: {
          requestId: updatedRequest._id,
          type: 'rental_request_status_update',
          status,
        },
      });

      conversation.lastMessage = decisionMessage._id;
      await conversation.save();
    }
  }

  const tenantId = request.tenant?._id || request.tenant;
  const propertyTitle = request.property?.title || 'votre logement';
  let notificationTitle = null;
  let notificationPreview = null;
  let notificationContent = null;

  if (normalizedStatus.includes('accept')) {
    notificationTitle = 'Demande de location acceptee';
    notificationPreview = `Votre demande pour ${propertyTitle} a ete acceptee.`;
    notificationContent = `Le proprietaire a accepte votre demande de location pour ${propertyTitle}. Vous pouvez consulter le suivi dans vos demandes.`;
  } else if (normalizedStatus.includes('refus')) {
    notificationTitle = 'Demande de location refusee';
    notificationPreview = `Votre demande pour ${propertyTitle} a ete refusee.`;
    notificationContent = `Le proprietaire a refuse votre demande de location pour ${propertyTitle}.`;
  }

  if (tenantId && notificationTitle) {
    const notificationPayload = {
      recipient: tenantId,
      type: 'SystÃ¨me',
      title: notificationTitle,
      preview: notificationPreview,
      content: notificationContent,
      status: 'En attente',
      isRead: false,
    };

    if (conversation) {
      notificationPayload.messageMeta = {
        conversationId: conversation._id.toString(),
        senderId: req.user._id.toString(),
        senderName: req.user.fullName || 'Proprietaire',
        contextId: String(requestId),
      };
    }

    await Notification.create(notificationPayload);
  }

  if (normalizedStatus.includes('accept') || status === 'Contrat actif') {
    const propertyService = require('../services/property.service');
    await propertyService.updatePropertyById(request.property._id, { status: 'rented' });
  }

  res.send(updatedRequest);
});

const deleteRequest = asyncHandler(async (req, res) => {
  const requestId = req.params.requestId;
  const request = await rentalRequestService.getRentalRequestById(requestId);

  if (request.tenant._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ApiError(403, 'Forbidden');
  }

  await rentalRequestService.deleteRentalRequestById(requestId);
  res.status(204).send();
});

module.exports = {
  createRequest,
  getRequests,
  updateRequestStatus,
  deleteRequest,
};
