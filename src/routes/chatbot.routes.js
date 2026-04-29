const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbot.controller');
const { optionalAuth } = require('../middlewares/auth.middleware');

router.post('/ask', optionalAuth, chatbotController.askChatbot);

module.exports = router;
