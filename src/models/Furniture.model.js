const mongoose = require('mongoose');

const furnitureSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { 
    type: String, 
    required: true,
    enum: ['Salon', 'Chambre', 'Salle à manger', 'Cuisine', 'Décoration', 'Bureau']
  },
  price: { type: Number, required: true },
  image: { type: String, required: true },
  description: { type: String },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'requested'], 
    default: 'approved'
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('Furniture', furnitureSchema);
