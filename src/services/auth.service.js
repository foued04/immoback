const bcrypt = require('bcryptjs');
const User = require('../models/User.model');
const ApiError = require('../utils/ApiError');
const emailService = require('./email.service');

const createUser = async (userData) => {
  // Block admin registration
  if (userData.role === 'admin') {
    throw new ApiError(403, 'La création de comptes administrateur est interdite');
  }

  if (await User.findOne({ email: userData.email })) {
    throw new ApiError(400, 'L\'adresse email est déjà utilisée');
  }
  
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(userData.password, salt);
  
  // Generate verification code
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  const verificationCodeExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

  const user = await User.create({
    ...userData,
    password: hashedPassword,
    verificationCode,
    verificationCodeExpires,
    isEmailVerified: false,
  });

  let emailDelivery = { delivered: false };
  try {
    await emailService.sendVerificationEmail(user.email, verificationCode);
    emailDelivery = { delivered: true };
  } catch (error) {
    console.error('Failed to send verification email:', error);
    emailDelivery = {
      delivered: false,
      message: "Le compte a ete cree, mais l'email de verification n'a pas pu etre envoye.",
      error: error.message,
    };
  }

  return { user, verificationCode, emailDelivery };
};

const loginUserWithEmailAndPassword = async (email, password) => {
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new ApiError(401, 'Email ou mot de passe incorrect');
  }

  if (user.isSuspended) {
    throw new ApiError(403, 'Ce compte a ete suspendu par l administration.');
  }

  // Block login if email is not verified
  if (user.role !== 'admin' && !user.isEmailVerified) {
    throw new ApiError(401, 'Veuillez vérifier votre adresse email avant de vous connecter.');
  }

  return user;
};

// ─── Password Reset ────────────────────────────────────────────────────────

const generateResetCode = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, 'Aucun utilisateur trouvé avec cette adresse email');
  }
  
  // Generate a random 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Save code and set expiration to 15 minutes from now
  user.resetPasswordCode = code;
  user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
  await user.save();
  
  // Send email
  await emailService.sendResetPasswordEmail(email, code);
  
  return code;
};

const verifyEmail = async (email, code) => {
  const user = await User.findOne({ 
    email,
    verificationCode: code,
    verificationCodeExpires: { $gt: Date.now() }
  });
  
  if (!user) {
    throw new ApiError(400, 'Code de vérification invalide ou expiré');
  }
  
  user.isEmailVerified = true;
  user.verificationCode = undefined;
  user.verificationCodeExpires = undefined;
  await user.save();
  
  return true;
};

const resendVerificationCode = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, 'Aucun utilisateur trouve avec cette adresse email');
  }

  if (user.isEmailVerified) {
    throw new ApiError(400, 'Cette adresse email est deja verifiee');
  }

  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  user.verificationCode = verificationCode;
  user.verificationCodeExpires = Date.now() + 24 * 60 * 60 * 1000;
  await user.save();

  try {
    await emailService.sendVerificationEmail(user.email, verificationCode);
    return {
      verificationCode,
      emailDelivery: {
        delivered: true,
        message: 'Un nouveau code de verification a ete envoye.',
      },
    };
  } catch (error) {
    console.error('Failed to resend verification email:', error);
    return {
      verificationCode,
      emailDelivery: {
        delivered: false,
        message: "Impossible d'envoyer l'email de verification pour le moment.",
        error: error.message,
      },
    };
  }
};

const verifyResetCode = async (email, code) => {
  const user = await User.findOne({ 
    email,
    resetPasswordCode: code,
    resetPasswordExpires: { $gt: Date.now() } // Ensure code hasn't expired
  });
  
  if (!user) {
    throw new ApiError(400, 'Code de vérification invalide ou expiré');
  }
  
  return true;
};

const resetPassword = async (email, code, newPassword) => {
  const user = await User.findOne({ 
    email,
    resetPasswordCode: code,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    throw new ApiError(400, 'Code de vérification invalide ou expiré');
  }

  // Hash new password
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  
  // Clear reset fields
  user.resetPasswordCode = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  return user;
};

const updateUser = async (userId, updateData) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'Utilisateur non trouvé');
  }

  // Prevent email, password, and role update via this specific method
  delete updateData.email;
  delete updateData.password;
  delete updateData.role;

  Object.assign(user, updateData);
  await user.save();
  return user;
};

const updatePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId);
  if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
    throw new ApiError(401, 'Mot de passe actuel incorrect');
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  await user.save();
  return user;
};

module.exports = {
  createUser,
  loginUserWithEmailAndPassword,
  generateResetCode,
  verifyResetCode,
  resetPassword,
  verifyEmail,
  resendVerificationCode,
  updateUser,
  updatePassword,
};
