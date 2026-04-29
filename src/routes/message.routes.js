const express = require('express');
const { auth } = require('../middlewares/auth.middleware');
const messageController = require('../controllers/message.controller');

const router = express.Router();

router.use(auth);

router
  .route('/')
  .get(messageController.getConversations)
  .post(messageController.sendMessage);

router
  .route('/:conversationId/messages')
  .get(messageController.getMessages);

router
  .route('/context/:contextId')
  .get(messageController.getConversationByContext);

router
  .route('/unread-count')
  .get(messageController.getUnreadCount);

module.exports = router;
