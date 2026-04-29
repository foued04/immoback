const express = require('express');
const { auth, authorize } = require('../middlewares/auth.middleware');
const verificationController = require('../controllers/verification.controller');

const router = express.Router();

// Self-service route: Upload document
router.post('/upload/:docType', auth, authorize('owner', 'tenant'), verificationController.uploadDocument);

// Admin routes: Manage verifications
router.get('/pending', auth, authorize('admin'), verificationController.getPendingVerifications);
router.patch('/verify/:userId/:docType', auth, authorize('admin'), verificationController.verifyDocument);

module.exports = router;
