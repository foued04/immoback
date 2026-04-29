const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Conversation = require('../models/Conversation.model');
const Message = require('../models/Message.model');
const RentalRequest = require('../models/RentalRequest.model');
const Notification = require('../models/Notification.model');

const asStringId = (value) => (value ? value.toString() : '');

const inferRecipientFromContext = async (contextId, senderId) => {
  if (!contextId) return null;

  const rentalRequest = await RentalRequest.findById(contextId)
    .populate('tenant', '_id')
    .populate('property', 'owner');

  if (!rentalRequest) return null;

  const tenantId = asStringId(rentalRequest.tenant?._id || rentalRequest.tenant);
  const ownerId = asStringId(rentalRequest.property?.owner);
  const sender = asStringId(senderId);

  if (sender === tenantId) return ownerId || null;
  if (sender === ownerId) return tenantId || null;
  return null;
};

const getConversations = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({
    participants: req.user._id
  })
  .populate('participants', 'fullName role email')
  .populate('lastMessage')
  .sort({ updatedAt: -1 });
  
  res.send(conversations);
});

const getMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  
  const conversation = await Conversation.findById(conversationId);
  if (!conversation || !conversation.participants.includes(req.user._id)) {
    throw new ApiError(403, 'Forbidden');
  }
  
  const messages = await Message.find({ conversation: conversationId })
    .populate('sender', 'fullName role')
    .sort({ createdAt: 1 });
    
  // Mark messages as read
  await Message.updateMany(
    { conversation: conversationId, sender: { $ne: req.user._id }, isRead: false },
    { isRead: true }
  );
    
  res.send(messages);
});

const sendMessage = asyncHandler(async (req, res) => {
  const { conversationId, content, category, contextId, contextTitle, recipientId } = req.body;
  const normalizedContextId = contextId ? String(contextId).trim() : null;
  const messageContent = String(content || '').trim();
  
  let conversation;
  
  if (conversationId) {
    conversation = await Conversation.findById(conversationId);
    if (conversation && !conversation.participants.some((p) => asStringId(p) === asStringId(req.user._id))) {
      throw new ApiError(403, 'Forbidden');
    }
  } else if (contextId) {
    // Find existing conversation for this context and current user.
    conversation = await Conversation.findOne({ contextId: normalizedContextId, participants: req.user._id })
      .sort({ updatedAt: -1 });
    
    let finalRecipientId = recipientId;
    if (!conversation && !finalRecipientId) {
      finalRecipientId = await inferRecipientFromContext(normalizedContextId, req.user._id);
    }

    if (!conversation && finalRecipientId) {
      conversation = await Conversation.create({
        participants: [req.user._id, finalRecipientId],
        category: category || 'Demandes',
        contextId: normalizedContextId,
        contextTitle
      });
    }
  }
  
  if (!conversation) {
    throw new ApiError(404, 'Conversation not found');
  }
  
  const message = await Message.create({
    conversation: conversation._id,
    sender: req.user._id,
    content: messageContent
  });
  
  conversation.lastMessage = message._id;
  await conversation.save();

  const recipients = (conversation.participants || [])
    .map((participant) => asStringId(participant))
    .filter((participantId) => participantId && participantId !== asStringId(req.user._id));

  await Promise.all(
    recipients.map((participantId) =>
      Notification.create({
        recipient: participantId,
        type: 'Système',
        title: 'Nouveau message',
        preview: `${req.user.fullName || 'Un utilisateur'} vous a envoye un message.`,
        content: messageContent.length > 160 ? `${messageContent.slice(0, 157)}...` : messageContent,
        status: 'En attente',
        isRead: false,
        messageMeta: {
          conversationId: conversation._id.toString(),
          messageId: message._id.toString(),
          senderId: req.user._id.toString(),
          senderName: req.user.fullName || 'Utilisateur',
          contextId: conversation.contextId || '',
        },
      })
    )
  );
  
  res.status(201).send(message);
});

const getConversationByContext = asyncHandler(async (req, res) => {
  const { contextId } = req.params;
  const normalizedContextId = String(contextId || '').trim();
  const conversation = await Conversation.findOne({ 
    contextId: normalizedContextId, 
    participants: req.user._id 
  })
  .sort({ updatedAt: -1 })
  .populate('participants', 'fullName role');
  
  if (!conversation) {
    return res.send({ conversation: null, messages: [] });
  }
  
  const messages = await Message.find({ conversation: conversation._id })
    .populate('sender', 'fullName role')
    .sort({ createdAt: 1 });
    
  // Mark messages as read
  await Message.updateMany(
    { conversation: conversation._id, sender: { $ne: req.user._id }, isRead: false },
    { isRead: true }
  );
    
  res.send({ conversation, messages });
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({
    participants: req.user._id
  });
  
  const conversationIds = conversations.map(c => c._id);
  
  const count = await Message.countDocuments({
    conversation: { $in: conversationIds },
    sender: { $ne: req.user._id },
    isRead: false
  });
  
  res.send({ count });
});

module.exports = {
  getConversations,
  getMessages,
  sendMessage,
  getConversationByContext,
  getUnreadCount
};
