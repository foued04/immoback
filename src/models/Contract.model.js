const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema({
  request: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'RentalRequest', 
    unique: true,
    required: true 
  },
  property: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Property', 
    required: true 
  },
  owner: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  tenant: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['Draft', 'SignedByOwner', 'SentToTenant', 'SignedByTenant', 'SignedByBoth'], 
    default: 'Draft' 
  },
  ownerSignature: { type: String }, // Base64 signature
  tenantSignature: { type: String }, // Base64 signature
  tenantMessage: { type: String }, // Optional message from owner when sending
  content: { type: String }, // Optional detailed contract text
  rentAmount: { type: Number, required: true },
  depositAmount: { type: Number, required: true },
  startDate: { type: String },
  endDate: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Contract', contractSchema);
