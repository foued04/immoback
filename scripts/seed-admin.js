const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User.model');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@immosmart.tn';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_NAME = process.env.ADMIN_NAME || 'ImmoSmart Admin';

async function seedAdmin() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing from backend/.env');
  }

  await mongoose.connect(process.env.MONGO_URI);

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const existingUser = await User.findOne({ email: ADMIN_EMAIL });

  if (existingUser) {
    existingUser.fullName = existingUser.fullName || ADMIN_NAME;
    existingUser.password = hashedPassword;
    existingUser.role = 'admin';
    existingUser.isEmailVerified = true;
    existingUser.isSuspended = false;
    await existingUser.save();

    console.log(`Updated admin account: ${ADMIN_EMAIL}`);
  } else {
    await User.create({
      fullName: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: 'admin',
      isEmailVerified: true,
      isSuspended: false,
    });

    console.log(`Created admin account: ${ADMIN_EMAIL}`);
  }
}

seedAdmin()
  .catch((error) => {
    console.error('Failed to seed admin account:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
