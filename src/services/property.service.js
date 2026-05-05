const Property = require('../models/Property.model');
const ApiError = require('../utils/ApiError');

const pickAllowedPropertyFields = (payload = {}) => {
  const allowedFields = [
    'title',
    'description',
    'city',
    'address',
    'rent',
    'deposit',
    'type',
    'surface',
    'bedrooms',
    'bathrooms',
    'equippedKitchen',
    'balcony',
    'parking',
    'availability',
    'status',
    'moderationStatus',
    'rejectionReason',
    'images',
    'furnishing',
    'meuble',
  ];

  return allowedFields.reduce((result, field) => {
    if (payload[field] !== undefined) {
      result[field] = payload[field];
    }
    return result;
  }, {});
};

/**
 * Create a new property
 * @param {Object} propertyBody
 * @returns {Promise<Property>}
 */
const createProperty = async (propertyBody) => {
  return Property.create({
    ...pickAllowedPropertyFields(propertyBody),
    owner: propertyBody.owner,
  });
};

/**
 * Query for properties
 * @param {Object} filter - Mongo filter
 * @returns {Promise<QueryResult>}
 */
const queryProperties = async (filter = {}) => {
  const properties = await Property.find(filter)
    .sort({ createdAt: -1 })
    .populate('owner', 'fullName email phone')
    .lean();
  return properties;
};

/**
 * Get property by id
 * @param {ObjectId} id
 * @returns {Promise<Property>}
 */
const getPropertyById = async (id) => {
  const property = await Property.findById(id).populate('owner', 'fullName email phone');
  if (!property) {
    throw new ApiError(404, 'Property not found');
  }
  return property;
};

/**
 * Update property by id
 * @param {ObjectId} propertyId
 * @param {Object} updateBody
 * @returns {Promise<Property>}
 */
const updatePropertyById = async (propertyId, updateBody) => {
  const property = await getPropertyById(propertyId);
  Object.assign(property, pickAllowedPropertyFields(updateBody));
  await property.save();
  return property;
};

/**
 * Delete property by id
 * @param {ObjectId} propertyId
 * @returns {Promise<Property>}
 */
const deletePropertyById = async (propertyId) => {
  const property = await getPropertyById(propertyId);
  await property.deleteOne();
  return property;
};

module.exports = {
  createProperty,
  queryProperties,
  getPropertyById,
  updatePropertyById,
  deletePropertyById,
};
