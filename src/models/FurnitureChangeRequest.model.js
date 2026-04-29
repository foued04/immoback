const mongoose = require('mongoose');

const CHANGE_REQUEST_TYPES = ['Remplacement', 'Echange', 'Reparation', 'Suppression', 'Ajout', 'Changement'];
const CHANGE_REQUEST_STATUSES = ['En attente', 'Approuve', 'Refuse', 'En cours', 'Termine'];

const furnitureChangeRequestSchema = new mongoose.Schema({
  furnitureId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Furniture',
    required: false
  },
  furnitureName: {
    type: String,
    required: false
  },
  contractId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contract',
    required: false
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: false
  },
  tenantId: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: CHANGE_REQUEST_TYPES,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  photo: {
    type: String
  },
  ownerResponse: {
    type: String
  },
  tenantResponse: {
    type: String
  },
  lastResponseBy: {
    type: String,
    enum: ['owner', 'tenant']
  },
  respondedAt: {
    type: Date
  },
  status: {
    type: String,
    enum: CHANGE_REQUEST_STATUSES,
    default: 'En attente'
  },
  date: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('FurnitureChangeRequest', furnitureChangeRequestSchema);
