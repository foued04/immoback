const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  city: { type: String, required: true },
  department: { type: String },
  address: { type: String, required: true },
  rent: { type: Number, required: true },
  deposit: { type: Number, required: true },
  type: { 
    type: String, 
    required: true,
    enum: ['s0', 's1', 's2', 's3', 's4', 'villa']
  },
  surface: { type: Number, required: true },
  bedrooms: { type: Number, required: true },
  bathrooms: { type: Number, required: true },
  livingRooms: { type: Number, default: 0 },
  equippedKitchen: { type: Boolean, default: false },
  balcony: { type: Boolean, default: false },
  parking: { type: Boolean, default: false },
  availability: {
    type: String,
    required: true,
    default: () => new Date().toISOString().slice(0, 10),
  },
  status: { 
    type: String, 
    enum: ['available', 'rented', 'maintenance'], 
    default: 'available' 
  },
  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  rejectionReason: {
    type: String,
    default: '',
    trim: true,
  },
  images: {
    cover: { type: String },
    kitchen: { type: String },
    bathroom: { type: String },
    bedroom: { type: String },
    livingRoom: { type: String },
    exterior: { type: String },
    gallery: [{ type: String }]
  },
  owner: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  furnishing: {
    type: { 
      type: String, 
      enum: ['Non meublé', 'Semi-meublé', 'Meublé', 'Meublé haut standing'],
      default: 'Non meublé'
    },
    level: { 
      type: String, 
      enum: ['Économique', 'Standard', 'Premium'],
      default: 'Standard'
    },
    estimatedTotalValue: { type: Number, default: 0 },
    items: [{
      name: { type: String },
      category: { type: String },
      condition: { type: String },
      quantity: { type: Number, default: 1 },
      estimatedPrice: { type: Number },
      description: { type: String }
    }]
  },
  meuble: { type: Boolean, default: false },
  lat: { type: Number },
  lng: { type: Number }
}, { timestamps: true });

module.exports = mongoose.model('Property', propertySchema);
