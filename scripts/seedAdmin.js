/**
 * Seed Admin Account
 * Creates/updates the single fixed admin account for ImmoSmart demo.
 * Usage: node scripts/seedAdmin.js
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const User = require('../src/models/User.model');

const ADMIN_EMAIL = 'admin@immosmart.tn';
const ADMIN_PASSWORD = 'admin123';
const ADMIN_FULLNAME = 'Administrateur ImmoSmart';

async function seedAdmin() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('❌ MONGO_URI non défini dans .env');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connecté à MongoDB');

    // Remove all existing admin accounts
    const deleted = await User.deleteMany({ role: 'admin' });
    if (deleted.deletedCount > 0) {
      console.log(`🗑️  ${deleted.deletedCount} ancien(s) compte(s) admin supprimé(s)`);
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

    // Create the single admin account
    const admin = await User.create({
      fullName: ADMIN_FULLNAME,
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: 'admin',
      isEmailVerified: true,
    });

    console.log('✅ Compte admin créé avec succès :');
    console.log(`   Email    : ${admin.email}`);
    console.log(`   Mot de passe : ${ADMIN_PASSWORD}`);
    console.log(`   Rôle     : ${admin.role}`);

    await mongoose.disconnect();
    console.log('✅ Déconnecté de MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors du seed admin :', error.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

seedAdmin();
