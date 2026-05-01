const mongoose = require('mongoose');

const NOTIFICATION_TYPES = [
  'R\u00e9clamation',
  'Contrat',
  'Syst\u00e8me',
  'V\u00e9rification',
  'Mobilier',
];

const NOTIFICATION_STATUSES = ['Vue par le propri\u00e9taire', 'En attente'];

const NotificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['Réclamation', 'Contrat', 'Système', 'Vérification', 'Mobilier'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  preview: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Vue par le propriétaire', 'En attente'],
    default: 'En attente'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  claimResponse: {
    message: String,
    intervention: {
      date: String,
      time: String,
      technician: String
    }
  },
  // Keep backward compatibility with old clients (string URLs) and new clients (object metadata)
  attachments: [{
    type: mongoose.Schema.Types.Mixed
  }],
  claimMeta: {
    claimId: String,
    tenantId: String,
    tenantName: String,
    ownerId: String,
    propertyId: String,
    propertyTitle: String,
    propertyAddress: String,
    subject: String,
    category: String,
    priority: String,
    description: String,
    source: String,
    photos: [String]
  },
  contractData: {
    contractId: String,
    requestId: String,
    propertyTitle: String,
    propertyAddress: String,
    propertyImage: String,
    startDate: String,
    endDate: String,
    rent: Number
  },
  messageMeta: {
    conversationId: String,
    messageId: String,
    senderId: String,
    senderName: String,
    contextId: String
  },
  furnitureMeta: {
    furnitureId: String,
    furnitureName: String,
    category: String,
    price: Number,
    image: String,
    ownerName: String,
    status: String,
    requestId: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Notification', NotificationSchema);
