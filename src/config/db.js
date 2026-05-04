const mongoose = require('mongoose');
const { MONGO_URI } = require('./env');

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    // On ne quitte pas le processus pour laisser le serveur web tourner sur Render et afficher les logs
  }
};

module.exports = connectDB;
