const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { auth } = require('../middlewares/auth.middleware');

router.get('/', auth, notificationController.getNotifications);
router.get('/unread-count', auth, notificationController.getUnreadCount);
router.patch('/:id/read', auth, notificationController.markAsRead);
router.post('/', auth, notificationController.createNotification);

module.exports = router;
