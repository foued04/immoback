const Notification = require('../models/Notification.model');
const asyncHandler = require('../utils/asyncHandler');

exports.getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ recipient: req.user.id })
    .sort({ createdAt: -1 });
  res.json(notifications);
});

exports.markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user.id },
    { isRead: true },
    { new: true }
  );
  if (!notification) {
    res.status(404).json({ message: 'Notification non trouvée' });
    return;
  }
  res.json(notification);
});

exports.createNotification = asyncHandler(async (req, res) => {
  const { recipient, type, title, preview, content, claimResponse, attachments, claimMeta, contractData } = req.body;
  
  // Normalize type to handle potential encoding issues from various sources
  let normalizedType = type;
  if (type) {
    const isMangledReclamation = type.includes('R\u00c3\u00a9') || type.includes('R\u00e9') || type === 'Réclamation';
    const isMangledSystem = type.includes('Syst\u00c3\u00a8') || type.includes('Syst\u00e8') || type === 'Système';
    const isMangledVerification = type.includes('V\u00c3\u00a9') || type.includes('V\u00e9') || type === 'Vérification';

    if (isMangledReclamation) normalizedType = 'Reclamation';
    else if (isMangledSystem) normalizedType = 'Systeme';
    else if (isMangledVerification) normalizedType = 'Verification';
  }

  const normalizedAttachments = Array.isArray(attachments)
    ? attachments
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') return item;
          return null;
        })
        .filter(Boolean)
    : [];

  const notification = new Notification({
    recipient,
    type: normalizedType,
    title,
    preview,
    content,
    claimResponse,
    attachments: normalizedAttachments,
    claimMeta,
    contractData
  });
  await notification.save();
  
  const { emitToUser } = require('../services/socket.service');
  emitToUser(recipient, 'new_notification', notification);
  
  res.status(201).json(notification);

});

exports.getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ 
    recipient: req.user.id,
    isRead: false 
  });
  res.json({ count });
});

exports.markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user.id, isRead: false },
    { isRead: true }
  );
  res.json({ message: 'Toutes les notifications ont été marquées comme lues' });
});

exports.getSentReclamations = asyncHandler(async (req, res) => {
  const reclamations = await Notification.find({
    type: { $in: ['Reclamation', 'Réclamation'] },
    'claimMeta.tenantId': req.user.id
  }).sort({ createdAt: -1 });
  res.json(reclamations);
});

exports.updateReclamation = asyncHandler(async (req, res) => {
  const { title, content, attachments, claimMeta } = req.body;
  
  const reclamation = await Notification.findOne({
    _id: req.params.id,
    type: { $in: ['Reclamation', 'Réclamation'] },
    'claimMeta.tenantId': req.user.id
  });

  if (!reclamation) {
    res.status(404).json({ message: 'Réclamation non trouvée ou non autorisée' });
    return;
  }

  // Check if already resolved/refused
  if (['Resolue', 'Refusee'].includes(reclamation.status)) {
    res.status(400).json({ message: 'Impossible de modifier une réclamation déjà traitée' });
    return;
  }

  reclamation.title = title || reclamation.title;
  reclamation.content = content || reclamation.content;
  reclamation.attachments = attachments || reclamation.attachments;
  if (claimMeta) {
    reclamation.claimMeta = { ...reclamation.claimMeta, ...claimMeta };
  }

  await reclamation.save();

  // Notify owner
  const { emitToUser } = require('../services/socket.service');
  emitToUser(reclamation.recipient, 'reclamation_updated', reclamation);

  res.json(reclamation);
});

exports.deleteReclamation = asyncHandler(async (req, res) => {
  const reclamation = await Notification.findOne({
    _id: req.params.id,
    type: { $in: ['Reclamation', 'Réclamation'] },
    'claimMeta.tenantId': req.user.id
  });

  if (!reclamation) {
    res.status(404).json({ message: 'Réclamation non trouvée ou non autorisée' });
    return;
  }

  // Optional: Check status before deletion if required
  // if (['Resolue', 'Refusee'].includes(reclamation.status)) { ... }

  const ownerId = reclamation.recipient;
  const reclamationId = reclamation._id;

  await reclamation.deleteOne();

  // Notify owner
  const { emitToUser } = require('../services/socket.service');
  emitToUser(ownerId, 'reclamation_deleted', { id: reclamationId });

  res.json({ message: 'Réclamation supprimée avec succès' });
});

exports.ownerRespondReclamation = asyncHandler(async (req, res) => {
  const { status, responseMessage, intervention } = req.body;
  
  const reclamation = await Notification.findOne({
    _id: req.params.id,
    type: { $in: ['Reclamation', 'Réclamation'] },
    recipient: req.user.id // Must be the owner (recipient of the original claim)
  });

  if (!reclamation) {
    res.status(404).json({ message: 'Réclamation non trouvée' });
    return;
  }

  if (status) reclamation.status = status;
  if (responseMessage || intervention) {
    reclamation.claimResponse = {
      message: responseMessage || reclamation.claimResponse?.message,
      intervention: intervention || reclamation.claimResponse?.intervention
    };
  }

  await reclamation.save();

  // Notify tenant (the one who created the claim)
  const { emitToUser } = require('../services/socket.service');
  if (reclamation.claimMeta && reclamation.claimMeta.tenantId) {
    emitToUser(reclamation.claimMeta.tenantId, 'reclamation_responded', reclamation);
    
    // Also update the tenant's tracking notification if it exists
    const tenantTrackingNotif = await Notification.findOne({
      type: { $in: ['Reclamation', 'Réclamation'] },
      recipient: reclamation.claimMeta.tenantId,
      'claimMeta.claimId': reclamation.claimMeta.claimId,
      'claimMeta.source': 'tenant'
    });
    
    if (tenantTrackingNotif) {
      tenantTrackingNotif.status = reclamation.status;
      tenantTrackingNotif.claimResponse = reclamation.claimResponse;
      tenantTrackingNotif.isRead = false; // Mark as unread so it pops up for tenant
      await tenantTrackingNotif.save();
      emitToUser(reclamation.claimMeta.tenantId, 'new_notification', tenantTrackingNotif);
    }
  }

  res.json(reclamation);
});
