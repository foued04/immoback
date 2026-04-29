const Furniture = require('../models/Furniture.model');
const FurnitureOrder = require('../models/FurnitureOrder.model');
const FurnitureChangeRequest = require('../models/FurnitureChangeRequest.model');
const Contract = require('../models/Contract.model');
const Property = require('../models/Property.model');
const Notification = require('../models/Notification.model');
const User = require('../models/User.model');
const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const CHANGE_REQUEST_STATUS = {
  pending: 'En attente',
  approved: 'Approuve',
  refused: 'Refuse',
};

/**
 * Get all furniture items
 */
const getFurniture = asyncHandler(async (req, res) => {
  let query = {};
  const role = req.user?.role;

  if (role === 'admin') {
    // Admin can browse the full furniture catalog.
    query = {};
  } else if (role === 'tenant' || role === 'owner') {
    // Both tenants and owners only see approved items in the general catalog.
    // Owners track their own pending suggestions in the "Demandes" (Requests) section.
    query = { status: 'approved' };
  } else {
    // Public/unauthenticated users only see approved items.
    query = { status: 'approved' };
  }

  const furniture = await Furniture.find(query);
  res.status(200).json(furniture);
});

/**
 * Get pending furniture items suggested by the current owner
 */
const getOwnerPendingFurniture = asyncHandler(async (req, res) => {
  const furniture = await Furniture.find({ 
    addedBy: req.user._id, 
    status: { $ne: 'approved' } 
  });
  res.status(200).json(furniture);
});

/**
 * Get furniture items for a specific property
 */
const getFurnitureByProperty = asyncHandler(async (req, res) => {
  const { propertyId } = req.params;

  // 1. Fetch the property to check furnishing items
  const property = await Property.findById(propertyId);
  if (!property) {
    throw new ApiError(404, 'Property not found');
  }

  // 2. Fetch confirmed orders for this property
  const confirmedOrders = await FurnitureOrder.find({
    property: propertyId,
    status: 'Confirmé'
  }).populate('items.furniture');

  // 3. Extract furniture items from orders
  let existingFurniture = [];
  
  // Add items from confirmed orders
  confirmedOrders.forEach(order => {
    order.items.forEach(item => {
      if (item.furniture) {
        existingFurniture.push({
          ...item.furniture._doc,
          id: item.furniture._id,
          quantity: item.quantity,
          orderSource: 'order'
        });
      }
    });
  });

  // 4. Also check property.furnishing.items if they exist (legacy or direct assignment)
  if (property.furnishing && property.furnishing.items && property.furnishing.items.length > 0) {
    // We would need to populate these if they were refs, but based on the model they might be direct objects
    // For now, we'll just merge them if not already present
    property.furnishing.items.forEach(item => {
      const alreadyAdded = existingFurniture.find(f => f.id.toString() === (item.furniture?._id || item.furniture)?.toString());
      if (!alreadyAdded) {
        existingFurniture.push({
          ...item,
          orderSource: 'property'
        });
      }
    });
  }

  res.status(200).json(existingFurniture);
});

/**
 * Add a new furniture item
 */
const addFurniture = asyncHandler(async (req, res) => {
  const { name, category, price, image, description } = req.body;

  if (!name || !category || !price || !image) {
    throw new ApiError(400, 'Name, category, price and image are required');
  }

  // Set initial status: owners need approval, admins are auto-approved
  const status = req.user.role === 'admin' ? 'approved' : 'pending';

  const furniture = await Furniture.create({
    name,
    category,
    price,
    image,
    description,
    status,
    addedBy: req.user._id,
  });

  // Notify Admins of new suggestion
  if (status === 'pending') {
    try {
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        await Notification.create({
          recipient: admin._id,
          type: 'Mobilier',
          title: 'Nouvelle suggestion de meuble',
          preview: `Une nouvelle suggestion "${name}" est en attente de validation.`,
          content: `Le propriétaire ${req.user.fullName || req.user.email} a suggéré d'ajouter "${name}" au catalogue de mobilier.`,
          furnitureMeta: {
            furnitureId: furniture._id,
            furnitureName: name,
            category,
            price,
            image,
            ownerName: req.user.fullName || req.user.email,
            status: 'pending'
          }
        });
      }
    } catch (error) {
      console.error('Error creating admin notification for furniture:', error);
    }
  }

  res.status(201).json(furniture);
});

/**
 * Update a furniture item
 */
const updateFurniture = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, category, price, image, description } = req.body;

  const furniture = await Furniture.findById(id);
  if (!furniture) {
    throw new ApiError(404, 'Furniture not found');
  }

  // Check permissions: only admin or the user who added it can update
  if (req.user.role !== 'admin' && furniture.addedBy?.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You do not have permission to update this item');
  }

  const updatedFurniture = await Furniture.findByIdAndUpdate(
    id,
    { name, category, price, image, description },
    { new: true, runValidators: true }
  );

  res.status(200).json(updatedFurniture);
});

/**
 * Delete a furniture item
 */
const deleteFurniture = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const furniture = await Furniture.findById(id);
  if (!furniture) {
    throw new ApiError(404, 'Furniture not found');
  }

  // Check permissions
  if (req.user.role !== 'admin' && furniture.addedBy?.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You do not have permission to delete this item');
  }

  await Furniture.findByIdAndDelete(id);
  res.status(200).json({ message: 'Furniture deleted successfully' });
});

/**
 * Update furniture status (Admin only)
 */
const updateFurnitureStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['pending', 'approved', 'rejected', 'requested'].includes(status)) {
    throw new ApiError(400, 'Invalid status');
  }

  const furniture = await Furniture.findByIdAndUpdate(id, { status }, { new: true });

  if (!furniture) {
    throw new ApiError(404, 'Furniture not found');
  }

  res.status(200).json(furniture);
});

/**
 * Create or Update a Furniture Order (Voucher)
 * The _id of the order is the same as the contract _id when contractId is provided
 */
const saveFurnitureOrder = asyncHandler(async (req, res) => {
  const { contractId, propertyId, items, total, paymentMethod } = req.body;

  if ((!contractId && !propertyId) || !items || items.length === 0) {
    throw new ApiError(400, 'Contract/Property ID and items are required');
  }

  let property;
  let tenantValue;
  let ownerValue;

  if (contractId) {
    // Ordering via contract (Tenant workflow)
    const contract = await Contract.findById(contractId).populate('property');
    if (!contract) {
      throw new ApiError(404, 'Contract not found');
    }

    property = contract.property?._id || contract.property;
    tenantValue = (contract.tenant?._id || contract.tenant)?.toString();
    ownerValue = (contract.owner?._id || contract.owner)?.toString();

    if (req.user.role === 'tenant' && tenantValue !== req.user._id.toString()) {
      throw new ApiError(403, 'You do not have permission to order for this contract');
    }

    if (req.user.role === 'owner' && ownerValue !== req.user._id.toString()) {
      throw new ApiError(403, 'You do not have permission to order for this contract');
    }
  } else {
    // Ordering via property directly (Owner or Tenant workflow)
    const propertyObj = await Property.findById(propertyId);
    if (!propertyObj) {
      throw new ApiError(404, 'Property not found');
    }

    property = propertyObj._id;
    ownerValue = propertyObj.owner?.toString();
    tenantValue = req.user.role === 'tenant' ? req.user._id.toString() : undefined;

    if (req.user.role === 'owner' && ownerValue !== req.user._id.toString()) {
      throw new ApiError(403, 'You do not have permission to order for this property');
    }
  }

  const orderId = contractId || new mongoose.Types.ObjectId();
  let order = await FurnitureOrder.findById(orderId);

  const orderStatus = req.user.role === 'owner' ? 'Confirmé' : 'Brouillon';

  if (order) {
    order.items = items;
    order.total = total;
    order.paymentMethod = paymentMethod || order.paymentMethod;
    if (tenantValue) {
      order.tenant = tenantValue;
    }
    await order.save();
  } else {
    order = new FurnitureOrder({
      _id: orderId,
      contract: contractId || undefined,
      tenant: tenantValue || undefined,
      property,
      owner: ownerValue,
      items,
      total,
      paymentMethod: paymentMethod || 'cash',
      status: orderStatus,
    });
    await order.save();
  }

  // Notify Admins of new confirmed order
  if (orderStatus === 'Confirmé') {
    try {
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        await Notification.create({
          recipient: admin._id,
          type: 'Mobilier',
          title: 'Nouvelle commande de mobilier',
          preview: `Une nouvelle commande de ${items.length} articles a été passée.`,
          content: `Une commande de mobilier d'un montant total de ${total} DT a été validée pour un bien immobilier par ${req.user.fullName || req.user.email}.`,
        });
      }
    } catch (error) {
      console.error('Error creating admin notification for furniture order:', error);
    }
  }

  res.status(201).json(order);
});

/**
 * Get furniture order by contract ID
 */
const getFurnitureOrderByContract = asyncHandler(async (req, res) => {
  const { contractId } = req.params;
  const order = await FurnitureOrder.findById(contractId).populate('items.furniture');

  if (!order) {
    return res.status(404).json({ message: 'No furniture order found for this contract' });
  }

  res.status(200).json(order);
});

/**
 * Get all furniture orders for an owner
 */
const getFurnitureOrdersForOwner = asyncHandler(async (req, res) => {
  const ownerCandidates = [req.user._id?.toString(), req.user.email].filter(Boolean);

  const orders = await FurnitureOrder.find({ owner: { $in: ownerCandidates } })
    .populate('items.furniture')
    .sort({ createdAt: -1 });

  res.status(200).json(orders);
});

/**
 * Get all furniture orders for a tenant
 */
const getFurnitureOrdersForTenant = asyncHandler(async (req, res) => {
  const tenantCandidates = [req.user._id?.toString(), req.user.email].filter(Boolean);

  const orders = await FurnitureOrder.find({ tenant: { $in: tenantCandidates } })
    .populate('items.furniture')
    .sort({ createdAt: -1 });

  res.status(200).json(orders);
});

/**
 * Create a furniture change request
 */
const createChangeRequest = asyncHandler(async (req, res) => {
  const { furnitureId, furnitureName, contractId, propertyId, type, reason, description, photo } = req.body;

  if ((!furnitureId && !furnitureName) || (!contractId && !propertyId) || !type || !reason) {
    throw new ApiError(400, 'Furniture, context and reason are required');
  }

  let finalFurnitureName = furnitureName;
  let furniture = null;
  if (furnitureId && mongoose.Types.ObjectId.isValid(furnitureId)) {
    furniture = await Furniture.findById(furnitureId);
    if (furniture) {
      finalFurnitureName = furniture.name;
    }
  }

  if (!finalFurnitureName) {
    throw new ApiError(400, 'Furniture name or ID is required');
  }

  let resolvedContractId = contractId;
  let resolvedPropertyId = propertyId;
  let ownerRecipientId = null;

  if (contractId) {
    const contract = await Contract.findById(contractId);

    if (contract) {
      resolvedPropertyId = resolvedPropertyId || contract.property?.toString();
      ownerRecipientId = contract.owner?.toString();

      if (req.user.role === 'tenant' && contract.tenant?.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 'You do not have permission to request a change for this contract');
      }
    } else {
      // Fallback: if frontend sends a furniture-order id as context id
      const order = await FurnitureOrder.findById(contractId);
      if (!order) {
        throw new ApiError(404, 'Contract or order not found');
      }

      resolvedPropertyId = resolvedPropertyId || order.property?.toString();
      ownerRecipientId = order.owner?.toString() || null;

      if (req.user.role === 'tenant' && order.tenant && order.tenant.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 'You do not have permission to request a change for this order');
      }
    }
  }

  if (!ownerRecipientId && resolvedPropertyId && mongoose.Types.ObjectId.isValid(resolvedPropertyId)) {
    const property = await Property.findById(resolvedPropertyId);
    if (property) {
      ownerRecipientId = property.owner?.toString() || null;
    }
  }

  if (!resolvedContractId) {
    resolvedContractId = new mongoose.Types.ObjectId();
  }

  const changeRequest = await FurnitureChangeRequest.create({
    furnitureId: (furnitureId && mongoose.Types.ObjectId.isValid(furnitureId)) ? furnitureId : null,
    furnitureName: finalFurnitureName,
    contractId: resolvedContractId,
    propertyId: resolvedPropertyId,
    tenantId: req.user.email || req.user._id,
    type,
    reason,
    description,
    photo,
  });

  if (ownerRecipientId) {
    let recipientUserId = ownerRecipientId;

    if (!mongoose.Types.ObjectId.isValid(recipientUserId)) {
      const ownerUser = await User.findOne({ email: ownerRecipientId });
      recipientUserId = ownerUser?._id?.toString();
    }

    if (recipientUserId && mongoose.Types.ObjectId.isValid(recipientUserId)) {
      await Notification.create({
        recipient: recipientUserId,
        type: 'Mobilier',
        title: 'Nouvelle demande de changement de meuble',
        preview: `Un locataire a demandé un changement pour "${finalFurnitureName}".`,
        content: `Le locataire a soumis une demande de changement (${type}) pour "${finalFurnitureName}". Raison: ${reason}. ${description ? '\n\nDescription: ' + description : ''}`,
        furnitureMeta: {
          furnitureId: (furnitureId && mongoose.Types.ObjectId.isValid(furnitureId)) ? furnitureId : null,
          furnitureName: finalFurnitureName,
          category: type,
          image: photo || (furniture?.images?.[0] || ''),
          ownerName: req.user.fullName || req.user.email,
          status: 'pending'
        }
      });

      // Also notify admins
      try {
        const admins = await User.find({ role: 'admin' });
        for (const admin of admins) {
          if (admin._id.toString() !== recipientUserId) { // Don't notify twice if owner is admin (unlikely but safe)
            await Notification.create({
              recipient: admin._id,
              type: 'Mobilier',
              title: 'Demande de changement mobilier',
              preview: `Changement demandé pour "${furniture.name}".`,
              content: `Un locataire a soumis une demande de changement (${type}) pour "${furniture.name}".`,
            });
          }
        }
      } catch (error) {
        console.error('Error notifying admins of change request:', error);
      }
    }
  }

  res.status(201).json(changeRequest);
});

/**
 * Get change requests for a contract
 */
const getChangeRequestsByContract = asyncHandler(async (req, res) => {
  const { contractId } = req.params;
  const requests = await FurnitureChangeRequest.find({ contractId }).populate('furnitureId').sort({ createdAt: -1 });

  res.status(200).json(requests);
});

/**
 * Get all furniture change requests (Admin only)
 */
const getAllChangeRequests = asyncHandler(async (req, res) => {
  const requests = await FurnitureChangeRequest.find({})
    .populate('furnitureId')
    .populate('propertyId')
    .sort({ createdAt: -1 });
  res.status(200).json(requests);
});

/**
 * Get all furniture orders (Admin only)
 */
const getAllFurnitureOrders = asyncHandler(async (req, res) => {
  const orders = await FurnitureOrder.find({})
    .populate('items.furniture')
    .populate('property')
    .sort({ createdAt: -1 });
  res.status(200).json(orders);
});

/**
 * Get all furniture change requests for an owner's properties
 */
const getOwnerChangeRequests = asyncHandler(async (req, res) => {
  const ownerId = req.user._id;

  // 1. Find all properties owned by this user
  const properties = await Property.find({ owner: ownerId }).select('_id');
  const propertyIds = properties.map(p => p._id);

  // 2. Find all change requests for these properties
  const requests = await FurnitureChangeRequest.find({ propertyId: { $in: propertyIds } })
    .populate('furnitureId', 'name category image price')
    .populate('propertyId', 'title address images')
    .sort({ createdAt: -1 });

  res.status(200).json(requests);
});

/**
 * Review a furniture change request as owner
 */
const reviewChangeRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, ownerResponse } = req.body;

  if (!['Approuvé', 'Refusé'].includes(status)) {
    throw new ApiError(400, 'Invalid status for review');
  }

  const changeRequest = await FurnitureChangeRequest.findById(id).populate('propertyId', 'title owner');
  if (!changeRequest) {
    throw new ApiError(404, 'Change request not found');
  }

  const propertyOwnerId = changeRequest.propertyId?.owner?.toString?.() || changeRequest.propertyId?.owner?.toString();
  if (!propertyOwnerId || propertyOwnerId !== req.user._id.toString()) {
    throw new ApiError(403, 'You do not have permission to review this change request');
  }

  changeRequest.status = status;
  changeRequest.ownerResponse = ownerResponse?.trim() || '';
  changeRequest.respondedAt = new Date();
  await changeRequest.save();

  let tenantRecipient = null;
  if (changeRequest.tenantId) {
    if (mongoose.Types.ObjectId.isValid(changeRequest.tenantId)) {
      tenantRecipient = await User.findById(changeRequest.tenantId);
    }
    if (!tenantRecipient) {
      tenantRecipient = await User.findOne({ email: changeRequest.tenantId });
    }
  }

  if (tenantRecipient?._id) {
    await Notification.create({
      recipient: tenantRecipient._id,
      type: 'Mobilier',
      title: `Demande de changement ${status === 'Approuvé' ? 'approuvée' : 'refusée'}`,
      preview: `Votre demande pour "${changeRequest.furnitureName}" a été ${status === 'Approuvé' ? 'approuvée' : 'refusée'}.`,
      content: ownerResponse?.trim()
        ? `Le propriétaire a ${status === 'Approuvé' ? 'approuvé' : 'refusé'} votre demande pour "${changeRequest.furnitureName}".\n\nRéponse: ${ownerResponse.trim()}`
        : `Le propriétaire a ${status === 'Approuvé' ? 'approuvé' : 'refusé'} votre demande pour "${changeRequest.furnitureName}".`,
      furnitureMeta: {
        furnitureId: changeRequest.furnitureId?.toString?.() || null,
        furnitureName: changeRequest.furnitureName,
        category: changeRequest.type,
        image: changeRequest.photo || '',
        ownerName: req.user.fullName || req.user.email,
        status,
      }
    });
  }

  const refreshed = await FurnitureChangeRequest.findById(id)
    .populate('furnitureId', 'name category image price')
    .populate('propertyId', 'title address images owner');

  res.status(200).json(refreshed);
});

const reviewChangeRequestV2 = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, ownerResponse } = req.body;

  if (![CHANGE_REQUEST_STATUS.approved, CHANGE_REQUEST_STATUS.refused, CHANGE_REQUEST_STATUS.pending].includes(status)) {
    throw new ApiError(400, 'Invalid status for review');
  }

  const changeRequest = await FurnitureChangeRequest.findById(id).populate('propertyId', 'title owner');
  if (!changeRequest) {
    throw new ApiError(404, 'Change request not found');
  }

  const propertyOwnerId = changeRequest.propertyId?.owner?.toString?.() || changeRequest.propertyId?.owner?.toString();
  if (!propertyOwnerId || propertyOwnerId !== req.user._id.toString()) {
    throw new ApiError(403, 'You do not have permission to review this change request');
  }

  changeRequest.status = status;
  changeRequest.ownerResponse = ownerResponse?.trim() || '';
  changeRequest.lastResponseBy = 'owner';
  changeRequest.respondedAt = new Date();
  await changeRequest.save();

  let tenantRecipient = null;
  if (changeRequest.tenantId) {
    if (mongoose.Types.ObjectId.isValid(changeRequest.tenantId)) {
      tenantRecipient = await User.findById(changeRequest.tenantId);
    }
    if (!tenantRecipient) {
      tenantRecipient = await User.findOne({ email: changeRequest.tenantId });
    }
  }

  if (tenantRecipient?._id) {
    const statusLabel = status === CHANGE_REQUEST_STATUS.approved ? 'approuvée' : 
                      status === CHANGE_REQUEST_STATUS.refused ? 'refusée' : 'reçue';
    
    const actionLabel = status === CHANGE_REQUEST_STATUS.approved ? 'approuvé' : 
                      status === CHANGE_REQUEST_STATUS.refused ? 'refusé' : 'répondu à';

    await Notification.create({
      recipient: tenantRecipient._id,
      type: 'Mobilier',
      title: status === CHANGE_REQUEST_STATUS.pending 
        ? `Nouveau message pour votre demande`
        : `Demande de changement ${statusLabel}`,
      preview: status === CHANGE_REQUEST_STATUS.pending
        ? `Le propriétaire a répondu à votre demande pour "${changeRequest.furnitureName}".`
        : `Votre demande pour "${changeRequest.furnitureName}" a été ${statusLabel}.`,
      content: ownerResponse?.trim()
        ? `Le propriétaire a ${actionLabel} votre demande pour "${changeRequest.furnitureName}".\n\nRéponse: ${ownerResponse.trim()}`
        : `Le propriétaire a ${actionLabel} votre demande pour "${changeRequest.furnitureName}".`,
      furnitureMeta: {
        furnitureId: changeRequest.furnitureId?.toString?.() || null,
        furnitureName: changeRequest.furnitureName,
        category: changeRequest.type,
        image: changeRequest.photo || '',
        ownerName: req.user.fullName || req.user.email,
        status,
      }
    });
  }

  const refreshed = await FurnitureChangeRequest.findById(id)
    .populate('furnitureId', 'name category image price')
    .populate('propertyId', 'title address images owner');

  res.status(200).json(refreshed);
});
/**
 * Reply to a furniture change request as tenant
 */
const replyToChangeRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { tenantResponse } = req.body;

  if (!tenantResponse?.trim()) {
    throw new ApiError(400, 'Response content is required');
  }

  const changeRequest = await FurnitureChangeRequest.findById(id).populate('propertyId', 'title owner');
  if (!changeRequest) {
    throw new ApiError(404, 'Change request not found');
  }

  changeRequest.tenantResponse = tenantResponse.trim();
  changeRequest.lastResponseBy = 'tenant';
  await changeRequest.save();

  // Notify the owner
  const propertyOwnerId = changeRequest.propertyId?.owner?.toString?.() || changeRequest.propertyId?.owner?.toString();
  if (propertyOwnerId) {
    let recipientUserId = propertyOwnerId;
    if (!mongoose.Types.ObjectId.isValid(recipientUserId)) {
      const ownerUser = await User.findOne({ email: propertyOwnerId });
      recipientUserId = ownerUser?._id?.toString();
    }

    if (recipientUserId) {
      await Notification.create({
        recipient: recipientUserId,
        type: 'Mobilier',
        title: `Nouveau message du locataire`,
        preview: `Le locataire a répondu concernant "${changeRequest.furnitureName}".`,
        content: `Le locataire a envoyé une réponse pour sa demande de changement mobilier pour "${changeRequest.furnitureName}".\n\nRéponse: ${tenantResponse.trim()}`,
        furnitureMeta: {
          furnitureId: changeRequest.furnitureId?.toString?.() || null,
          furnitureName: changeRequest.furnitureName,
          category: changeRequest.type,
          image: changeRequest.photo || '',
          ownerName: req.user.fullName || req.user.email,
          status: changeRequest.status,
          requestId: changeRequest._id
        }
      });
    }
  }

  res.status(200).json(changeRequest);
});

module.exports = {
  getFurniture,
  addFurniture,
  updateFurniture,
  deleteFurniture,
  updateFurnitureStatus,
  getFurnitureByProperty,
  saveFurnitureOrder,
  getFurnitureOrderByContract,
  getFurnitureOrdersForOwner,
  getFurnitureOrdersForTenant,
  createChangeRequest,
  getChangeRequestsByContract,
  getOwnerChangeRequests,
  reviewChangeRequest: reviewChangeRequestV2,
  getOwnerPendingFurniture,
  getAllChangeRequests,
  getAllFurnitureOrders,
  replyToChangeRequest,
};
