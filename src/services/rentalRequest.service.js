const RentalRequest = require('../models/RentalRequest.model');
const Property = require('../models/Property.model');
const ApiError = require('../utils/ApiError');
const Conversation = require('../models/Conversation.model');
const Message = require('../models/Message.model');

const createRentalRequest = async (requestBody) => {
  const property = await Property.findById(requestBody.property);
  if (!property) {
    throw new ApiError(404, 'Property not found');
  }

  const rentalRequest = await RentalRequest.create(requestBody);

  // Mirror the request in the discussion module.
  const contextId = String(rentalRequest._id);
  const contextTitle = `Demande location - ${property.title}`;
  let conversation = await Conversation.findOne({
    contextId,
    participants: { $all: [requestBody.tenant, property.owner] },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [requestBody.tenant, property.owner],
      category: 'Demandes',
      contextId,
      contextTitle,
    });
  }

  const requestMessage = requestBody.message?.trim();
  const content =
    requestMessage ||
    `Nouvelle demande de location pour "${property.title}" (${requestBody.duration || '12 mois'}).`;

  const message = await Message.create({
    conversation: conversation._id,
    sender: requestBody.tenant,
    content,
    source: 'platform',
    metadata: {
      requestId: rentalRequest._id,
      propertyId: property._id,
      type: 'rental_request_created',
    },
  });

  conversation.lastMessage = message._id;
  await conversation.save();

  try {
    const Notification = require('../models/Notification.model');
    const User = require('../models/User.model');
    const tenantUser = await User.findById(requestBody.tenant);
    
    await Notification.create({
      recipient: property.owner,
      type: 'Systeme',
      title: 'Nouvelle demande de location',
      preview: `Une nouvelle demande pour "${property.title}" est arriv\u00e9e.`,
      content: `Le locataire a envoy\u00e9 une demande pour le bien situ\u00e9 \u00e0 ${property.address}. Loyer: ${property.rent} TND.`,
      status: 'En attente',
      isRead: false,
      requestMeta: {
        requestId: rentalRequest._id.toString(),
        tenantId: requestBody.tenant.toString(),
        tenantName: tenantUser?.fullName || 'Un locataire',
        propertyId: property._id.toString(),
        propertyTitle: property.title
      }
    });
  } catch (error) {
    console.error('Error creating notification in service:', error);
  }

  return rentalRequest;
};

const queryRentalRequests = async (filter = {}) => {
  return RentalRequest.find(filter)
    .populate('tenant', 'fullName email phone')
    .populate('property', 'title address rent images owner');
};

const getRentalRequestById = async (id) => {
  const request = await RentalRequest.findById(id)
    .populate('tenant', 'fullName email phone')
    .populate('property', 'title address rent images owner');
  if (!request) {
    throw new ApiError(404, 'Rental request not found');
  }
  return request;
};

const updateRentalRequestStatus = async (requestId, status) => {
  const request = await getRentalRequestById(requestId);
  request.status = status;
  await request.save();
  return request;
};

const deleteRentalRequestById = async (id) => {
  const request = await RentalRequest.findById(id);
  if (!request) {
    throw new ApiError(404, 'Rental request not found');
  }
  await request.deleteOne();
  return request;
};

module.exports = {
  createRentalRequest,
  queryRentalRequests,
  getRentalRequestById,
  updateRentalRequestStatus,
  deleteRentalRequestById,
};
