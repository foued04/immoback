const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { auth } = require('../middlewares/auth.middleware');

router.get('/', auth, notificationController.getNotifications);
router.get('/reclamations/sent', auth, notificationController.getSentReclamations);
router.get('/unread-count', auth, notificationController.getUnreadCount);
router.patch('/read-all', auth, notificationController.markAllAsRead);
router.patch('/:id/read', auth, notificationController.markAsRead);
router.put('/reclamations/:id', auth, notificationController.updateReclamation);
router.put('/reclamations/:id/respond', auth, notificationController.ownerRespondReclamation);
router.delete('/reclamations/:id', auth, notificationController.deleteReclamation);
router.post('/', auth, notificationController.createNotification);

module.exports = router;
