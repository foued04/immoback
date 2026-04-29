const asyncHandler = require('../utils/asyncHandler');
const propertyService = require('../services/property.service');
const ApiError = require('../utils/ApiError');
const Contract = require('../models/Contract.model');
const User = require('../models/User.model');
const housingNeedService = require('../services/housingNeed.service');

const createProperty = asyncHandler(async (req, res) => {
  const propertyBody = {
    ...req.body,
    owner: req.user._id,
    moderationStatus: 'pending',
  };
  const property = await propertyService.createProperty(propertyBody);
  try {
    await housingNeedService.notifyMatchingHousingNeedsForProperty(property);
  } catch (error) {
    console.error('Housing need notification failed after property creation:', error);
  }
  res.status(201).send(property);
});

const getProperties = asyncHandler(async (req, res) => {
  const filter = {};
  
  if (!req.user) {
    // Public access: only show approved and available properties
    filter.moderationStatus = 'approved';
    filter.status = 'available';
  } else if (req.user.role === 'owner') {
    // Owner: see their own properties
    filter.owner = req.user._id;
  } else if (req.user.role === 'tenant') {
    // Tenant: only show approved properties that are still available
    filter.moderationStatus = 'approved';
    filter.status = 'available';
  }
  // Admin sees all by default (no filter added)
  
  const result = await propertyService.queryProperties(filter);

  if (req.user?.role === 'owner') {
    const signedContracts = await Contract.find({
      owner: req.user._id,
      status: { $in: ['SignedByTenant', 'SignedByBoth'] },
    }).select('property');
    const rentedPropertyIds = new Set(signedContracts.map((contract) => contract.property.toString()));

    return res.send(result.map((property) => {
      const propertyObject = property.toObject ? property.toObject() : property;
      return rentedPropertyIds.has(propertyObject._id.toString())
        ? { ...propertyObject, status: 'rented' }
        : propertyObject;
    }));
  }

  res.send(result);
});

const getProperty = asyncHandler(async (req, res) => {
  const property = await propertyService.getPropertyById(req.params.propertyId);
  res.send(property);
});

const getFavoriteProperties = asyncHandler(async (req, res) => {
  if (req.user.role !== 'tenant') {
    throw new ApiError(403, 'Only tenants can manage favorite properties');
  }

  const tenant = await User.findById(req.user._id)
    .populate({
      path: 'favoriteProperties',
      populate: {
        path: 'owner',
        select: 'fullName email phone',
      },
    });

  res.send(tenant?.favoriteProperties || []);
});

const addFavoriteProperty = asyncHandler(async (req, res) => {
  if (req.user.role !== 'tenant') {
    throw new ApiError(403, 'Only tenants can manage favorite properties');
  }

  const property = await propertyService.getPropertyById(req.params.propertyId);

  if (property.moderationStatus !== 'approved' || property.status !== 'available') {
    throw new ApiError(400, 'Only approved available properties can be added to favorites');
  }

  const tenant = await User.findByIdAndUpdate(
    req.user._id,
    { $addToSet: { favoriteProperties: property._id } },
    { new: true }
  ).populate({
    path: 'favoriteProperties',
    populate: {
      path: 'owner',
      select: 'fullName email phone',
    },
  });

  res.send(tenant?.favoriteProperties || []);
});

const removeFavoriteProperty = asyncHandler(async (req, res) => {
  if (req.user.role !== 'tenant') {
    throw new ApiError(403, 'Only tenants can manage favorite properties');
  }

  const tenant = await User.findByIdAndUpdate(
    req.user._id,
    { $pull: { favoriteProperties: req.params.propertyId } },
    { new: true }
  ).populate({
    path: 'favoriteProperties',
    populate: {
      path: 'owner',
      select: 'fullName email phone',
    },
  });

  res.send(tenant?.favoriteProperties || []);
});

const updateProperty = asyncHandler(async (req, res) => {
  const property = await propertyService.getPropertyById(req.params.propertyId);
  const ownerId = property.owner?._id || property.owner;
  
  // Check authorization
  if (req.user.role !== 'admin' && (!ownerId || ownerId.toString() !== req.user._id.toString())) {
    throw new ApiError(403, 'Forbidden');
  }

  const updatedProperty = await propertyService.updatePropertyById(req.params.propertyId, req.body);
  try {
    await housingNeedService.notifyMatchingHousingNeedsForProperty(updatedProperty);
  } catch (error) {
    console.error('Housing need notification failed after property update:', error);
  }
  res.send(updatedProperty);
});

const deleteProperty = asyncHandler(async (req, res) => {
  const property = await propertyService.getPropertyById(req.params.propertyId);
  const ownerId = property.owner?._id || property.owner;
  
  // Check authorization
  if (req.user.role !== 'admin' && (!ownerId || ownerId.toString() !== req.user._id.toString())) {
    throw new ApiError(403, 'Forbidden');
  }

  await propertyService.deletePropertyById(req.params.propertyId);
  res.status(204).send();
});

const getMyRentals = asyncHandler(async (req, res) => {
  if (req.user.role !== 'tenant') {
    throw new ApiError(403, 'Only tenants can view their rentals');
  }

  const contracts = await Contract.find({
    tenant: req.user._id,
    status: { $in: ['SignedByTenant', 'SignedByBoth'] }
  }).populate({
    path: 'property',
    populate: {
      path: 'owner',
      select: 'fullName email phone'
    }
  });

  const properties = contracts
    .filter(c => c.property) // Ensure property exists
    .map(c => c.property);
  
  res.send(properties);
});

module.exports = {
  createProperty,
  getProperties,
  getProperty,
  getFavoriteProperties,
  addFavoriteProperty,
  removeFavoriteProperty,
  getMyRentals,
  updateProperty,
  deleteProperty,
};
