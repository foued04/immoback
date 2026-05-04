const authService = require('../services/auth.service');
const tokenService = require('../services/token.service');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User.model');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const signup = asyncHandler(async (req, res) => {
  const { user, emailDelivery } = await authService.createUser(req.body);
  const accessToken = tokenService.generateAuthToken(user);

  res.status(emailDelivery.delivered ? 201 : 202).send({
    user,
    accessToken,
    message: emailDelivery.delivered
      ? emailDelivery.message || 'Compte cree. Un code de verification a ete envoye par email.'
      : `${emailDelivery.message} ${emailDelivery.error ? `Detail SMTP: ${emailDelivery.error}` : ''}`.trim(),
    emailDelivered: emailDelivery.delivered,
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.loginUserWithEmailAndPassword(email, password);
  const accessToken = tokenService.generateAuthToken(user);
  res.send({ user, accessToken });
});

const getMe = asyncHandler(async (req, res) => {
  res.send({ user: req.user });
});

// ─── Password Reset Endpoints ──────────────────────────────────────────────

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  await authService.generateResetCode(email);
  res.send({ message: 'Si cette adresse existe, un code de réinitialisation vous sera envoyé (voir console serveur).' });
});

const verifyResetCode = asyncHandler(async (req, res) => {
  const { email, code } = req.body;
  await authService.verifyResetCode(email, code);
  res.send({ valid: true, message: 'Code valide' });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { email, code, newPassword } = req.body;
  await authService.resetPassword(email, code, newPassword);
  res.send({ message: 'Mot de passe réinitialisé avec succès.' });
});

// ─── Google Login Stub ──────────────────────────────────────────────────

const googleLogin = asyncHandler(async (req, res) => {
  const { token, mode = 'login', role } = req.body;
  
  if (!token) {
    return res.status(400).send({ message: 'Token Google manquant' });
  }

  if (!['login', 'register'].includes(mode)) {
    return res.status(400).send({ message: 'Mode Google invalide' });
  }

  try {
    let payload;
    const isLikelyIdToken = token.split('.').length === 3;

    if (isLikelyIdToken) {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } else {
      // Frontend can send OAuth access_token with @react-oauth/google useGoogleLogin.
      // Validate audience, then fetch user identity.
      const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`);
      if (!tokenInfoRes.ok) {
        throw new Error('Invalid Google access token');
      }

      const tokenInfo = await tokenInfoRes.json();
      if (tokenInfo.aud !== process.env.GOOGLE_CLIENT_ID) {
        throw new Error('Google token audience mismatch');
      }

      const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!profileRes.ok) {
        throw new Error('Failed to fetch Google user profile');
      }

      payload = await profileRes.json();
    }

    const { email, name, picture, sub: googleId } = payload;

    if (!email) {
      return res.status(400).send({ message: 'Email Google introuvable' });
    }

    let user = await User.findOne({ email });

    if (mode === 'register') {
      if (user) {
        if (user.googleId && user.googleId !== googleId) {
          return res.status(409).send({
            message: 'Ce compte est deja lie a un autre compte Google.',
          });
        }

        if (!user.googleId) {
          user.googleId = googleId;
        }
        if (!user.avatar && picture) {
          user.avatar = picture;
        }
        if (!user.fullName && name) {
          user.fullName = name;
        }
        if (!user.isEmailVerified) {
          user.isEmailVerified = true;
        }

        await user.save();
      } else {
        user = await User.create({
          fullName: name || email.split('@')[0],
          email,
          password: Math.random().toString(36).slice(-10) + 'Xy1!',
          role: role === 'owner' ? 'owner' : 'tenant',
          avatar: picture || '',
          googleId,
          isEmailVerified: true,
        });
      }
    } else {
      if (!user) {
        return res.status(403).send({
          message: "Aucun compte trouve. Veuillez vous inscrire d'abord.",
        });
      }

      if (!user.googleId) {
        return res.status(403).send({
          message: "Ce compte n'est pas inscrit avec Google. Veuillez vous inscrire d'abord.",
        });
      }

      if (user.googleId !== googleId) {
        return res.status(403).send({
          message: 'Ce compte Google ne correspond pas a cet utilisateur.',
        });
      }

      let updated = false;
      if (!user.avatar && picture) {
        user.avatar = picture;
        updated = true;
      }
      if (!user.fullName && name) {
        user.fullName = name;
        updated = true;
      }
      if (updated) {
        await user.save();
      }
    }

    const accessToken = tokenService.generateAuthToken(user);
    res.send({ user, accessToken });
  } catch (error) {
    console.error('Google token verification failed:', error);
    res.status(401).send({ message: 'Authentification Google échouée' });
  }
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = await authService.updateUser(req.user.id, req.body);
  res.send({ user, message: 'Profil mis à jour avec succès' });
});

const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.updatePassword(req.user.id, currentPassword, newPassword);
  res.send({ message: 'Mot de passe modifié avec succès' });
});

const verifyEmail = asyncHandler(async (req, res) => {
  let { email, code, token } = req.body;

  // If we have a JWT token, decode it to get email and code
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      email = decoded.email;
      code = decoded.code;
    } catch (error) {
      return res.status(400).send({ message: 'Lien de vérification invalide ou expiré' });
    }
  }

  await authService.verifyEmail(email, code);
  
  // Find user and generate token for auto-login
  const user = await User.findOne({ email });
  const accessToken = tokenService.generateAuthToken(user);
  
  res.send({ 
    user, 
    accessToken,
    message: 'Email vérifié avec succès. Bienvenue !' 
  });
});

const resendVerificationEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const { emailDelivery } = await authService.resendVerificationCode(email);

  res.send({
    message: emailDelivery.delivered
      ? emailDelivery.message
      : `${emailDelivery.message} ${emailDelivery.error ? `Detail SMTP: ${emailDelivery.error}` : ''}`.trim(),
    emailDelivered: emailDelivery.delivered,
  });
});

module.exports = {
  signup,
  login,
  getMe,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  googleLogin,
  updateProfile,
  updatePassword,
  verifyEmail,
  resendVerificationEmail,
};
