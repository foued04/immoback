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
  const normalizedType =
    type === 'RÃ©clamation'
      ? 'Réclamation'
      : type === 'SystÃ¨me'
        ? 'Système'
        : type === 'VÃ©rification'
          ? 'Vérification'
          : type;
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
  res.status(201).json(notification);
});

exports.getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ 
    recipient: req.user.id,
    isRead: false 
  });
  res.json({ count });
});
