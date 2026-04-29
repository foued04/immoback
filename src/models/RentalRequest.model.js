const mongoose = require('mongoose');

const rentalRequestSchema = new mongoose.Schema({
  tenant: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  property: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Property', 
    required: true 
  },
  date: { type: String, required: true }, // Submission date
  duration: { type: String, required: true }, // e.g. "12 mois"
  message: { type: String },
  status: { 
    type: String, 
    enum: ['En attente', 'Acceptée', 'Refusée', 'Contrat généré', 'Contrat actif'], 
    default: 'En attente' 
  }
}, { timestamps: true });

module.exports = mongoose.model('RentalRequest', rentalRequestSchema);
