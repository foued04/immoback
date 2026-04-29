const Conversation = require('../models/Conversation.model');
const Message = require('../models/Message.model');

/**
 * Creates a message in a conversation. Finds or creates the conversation based on contextId.
 * @param {Object} params
 * @param {string} params.senderId
 * @param {string} params.recipientId
 * @param {string} params.contextId - The ID of the related object (e.g., requestId)
 * @param {string} params.contextTitle - Title for the conversation
 * @param {string} params.content - Message content
 * @param {string} [params.category] - Conversation category (default: 'Demandes')
 * @param {Object} [params.metadata] - Additional metadata for the message
 */
const createAutomatedMessage = async ({ senderId, recipientId, contextId, contextTitle, content, category = 'Demandes', metadata = {} }) => {
  try {
    // 1. Find or create conversation
    let conversation = await Conversation.findOne({ contextId });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, recipientId],
        category,
        contextId,
        contextTitle
      });
    } else {
      // Ensure both participants are in the conversation if it already exists
      const participantIds = conversation.participants.map(p => p.toString());
      if (!participantIds.includes(senderId.toString())) conversation.participants.push(senderId);
      if (!participantIds.includes(recipientId.toString())) conversation.participants.push(recipientId);
      await conversation.save();
    }

    // 2. Create message
    const message = await Message.create({
      conversation: conversation._id,
      sender: senderId,
      content,
      metadata
    });

    // 3. Update last message in conversation
    conversation.lastMessage = message._id;
    await conversation.save();

    return message;
  } catch (err) {
    console.error('Error in createAutomatedMessage utility:', err);
    throw err;
  }
};

module.exports = {
  createAutomatedMessage
};
