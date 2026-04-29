const mongoose = require('mongoose');

const furnitureOrderSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId }, // Will use the Contract ID
  contract: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Contract', 
    required: false 
  },
  tenant: { 
    type: String, 
    required: false 
  },
  property: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Property',
    required: true 
  },
  owner: { 
    type: String, 
    required: true 
  },
  items: [{
    furniture: { type: mongoose.Schema.Types.ObjectId, ref: 'Furniture' },
    name: { type: String },
    quantity: { type: Number, default: 1 },
    price: { type: Number }
  }],
  total: { type: Number, required: true },
  paymentMethod: { type: String, default: 'cash' },
  status: { 
    type: String, 
    enum: ['Brouillon', 'Confirmé'], 
    default: 'Brouillon' 
  },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('FurnitureOrder', furnitureOrderSchema);
