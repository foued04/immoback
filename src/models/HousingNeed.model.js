const mongoose = require('mongoose');

const housingNeedSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  desiredCity: {
    type: String,
    required: true,
    trim: true,
  },
  department: {
    type: String,
    trim: true,
    default: '',
  },
  minBudget: {
    type: Number,
    min: 0,
  },
  maxBudget: {
    type: Number,
    min: 0,
  },
  propertyType: {
    type: String,
    enum: ['s0', 's1', 's2', 's3', 's4', 'villa', ''],
    default: '',
  },
  bedrooms: {
    type: String,
    default: '',
  },
  moveInDate: {
    type: String,
    default: '',
  },
  duration: {
    type: String,
    default: '',
  },
  meuble: {
    type: Boolean,
    default: false,
  },
  parking: {
    type: Boolean,
    default: false,
  },
  nearCenter: {
    type: Boolean,
    default: false,
  },
  notes: {
    type: String,
    trim: true,
    default: '',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  notifiedPropertyIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
  }],
}, { timestamps: true });

module.exports = mongoose.model('HousingNeed', housingNeedSchema);
