const User = require('../models/User.model');
const Notification = require('../models/Notification.model');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

/**
 * Get all pending document verifications
 * GET /api/verifications/pending
 */
const getPendingVerifications = asyncHandler(async (req, res) => {
  const users = await User.find({
    $or: [
      { 'documents.cin.status': 'pending' },
      { 'documents.rib.status': 'pending' }
    ]
  }).select('fullName email phone documents');

  res.send(users);
});

/**
 * Update document verification status
 * PATCH /api/verifications/:userId/:docType
 */
const verifyDocument = asyncHandler(async (req, res) => {
  const { userId, docType } = req.params; // docType: 'cin' or 'rib'
  const { status, comment } = req.body; // status: 'verified' or 'rejected'

  if (!['cin', 'rib'].includes(docType)) {
    throw new ApiError(400, 'Invalid document type');
  }

  if (!['verified', 'rejected'].includes(status)) {
    throw new ApiError(400, 'Invalid status');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  user.documents[docType].status = status;
  user.documents[docType].comment = comment || '';
  
  if (status === 'verified') {
    user.documents[docType].verifiedAt = new Date();
  }

  await user.save();

  // Send notification to owner
  const docName = docType === 'cin' ? 'Carte d\'Identité (CIN)' : 'Relevé Bancaire (RIB)';
  const notificationTitle = status === 'verified' ? 'Document Vérifié' : 'Document Rejeté';
  const notificationText = status === 'verified' 
    ? `Votre document ${docName} a été approuvé par l'administrateur.`
    : `Votre document ${docName} a été rejeté. Raison: ${comment || 'Non spécifiée'}`;

  await Notification.create({
    recipient: userId,
    type: 'Vérification',
    title: notificationTitle,
    preview: notificationText,
    content: notificationText,
    status: 'En attente'
  });

  res.send({ message: `Document ${docType} updated to ${status}`, user });
});

/**
 * Upload owner document (Self-service)
 * POST /api/verifications/upload/:docType
 */
const uploadDocument = asyncHandler(async (req, res) => {
  const { docType } = req.params;
  const { url } = req.body;

  if (!['cin', 'rib'].includes(docType)) {
    throw new ApiError(400, 'Invalid document type');
  }

  if (!url || typeof url !== 'string') {
    throw new ApiError(400, 'A valid document payload is required');
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (!user.documents) {
    user.documents = {};
  }

  user.documents[docType] = {
    url,
    status: 'pending',
    uploadedAt: new Date(),
    comment: ''
  };

  await user.save();

  res.send({ message: `Document ${docType} uploaded and pending verification`, documents: user.documents });
});

module.exports = {
  getPendingVerifications,
  verifyDocument,
  uploadDocument
};
