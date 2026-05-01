const express = require('express');
const { z } = require('zod');
const { validate } = require('../middlewares/validate.middleware');
const { auth } = require('../middlewares/auth.middleware');
const authController = require('../controllers/auth.controller');

const router = express.Router();

const registerSchema = z.object({
  fullName: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['owner', 'tenant']).optional(),
  phone: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string()
});

router.post('/signup', validate(registerSchema), authController.signup);
router.post('/login', validate(loginSchema), authController.login);
router.get('/me', auth, authController.getMe);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-reset-code', authController.verifyResetCode);
router.post('/reset-password', authController.resetPassword);
router.post('/google', authController.googleLogin);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification-email', authController.resendVerificationEmail);

router.patch('/profile', auth, authController.updateProfile);
router.patch('/password', auth, authController.updatePassword);

module.exports = router;
