const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'owner', 'tenant'], default: 'tenant' },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  birthDate: { type: String, default: '' },
  avatar: { type: String, default: '' },
  googleId: { type: String, unique: true, sparse: true },
  isEmailVerified: { type: Boolean, default: false },
  isSuspended: { type: Boolean, default: false },
  verificationCode: { type: String },
  verificationCodeExpires: { type: Date },
  notificationPrefs: {
    acceptedRequests: { type: Boolean, default: true },
    ownerMessages: { type: Boolean, default: true },
    rentReminders: { type: Boolean, default: true }
  },
  resetPasswordCode: { type: String },
  resetPasswordExpires: { type: Date },
  documents: {
    cin: {
      url: { type: String, default: '' },
      status: { type: String, enum: ['pending', 'verified', 'rejected', 'none'], default: 'none' },
      comment: { type: String, default: '' },
      uploadedAt: { type: Date }
    },
    rib: {
      url: { type: String, default: '' },
      status: { type: String, enum: ['pending', 'verified', 'rejected', 'none'], default: 'none' },
      comment: { type: String, default: '' },
      uploadedAt: { type: Date }
    }
  },
  favoriteProperties: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
  }]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
