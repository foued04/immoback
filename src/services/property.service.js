const Property = require('../models/Property.model');
const ApiError = require('../utils/ApiError');
const { uploadToCloudinary } = require('../utils/cloudinary');

const pickAllowedPropertyFields = (payload = {}) => {
  const allowedFields = [
    'title',
    'description',
    'city',
    'department',
    'address',
    'rent',
    'deposit',
    'type',
    'surface',
    'bedrooms',
    'bathrooms',
    'livingRooms',
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
    'lat',
    'lng',
  ];

  return allowedFields.reduce((result, field) => {
    if (payload[field] !== undefined) {
      result[field] = payload[field];
    }
    return result;
  }, {});
};

/**
 * Helper to upload all images in the images object to Cloudinary
 * @param {Object} images 
 * @returns {Promise<Object>}
 */
const uploadPropertyImages = async (images) => {
  if (!images) return undefined;

  const uploadedImages = {
    gallery: []
  };
  
  // Use a map to avoid uploading the same base64 string multiple times
  const uploadCache = new Map();

  const getUploadedUrl = async (content) => {
    if (!content || typeof content !== 'string') return null;
    if (content.startsWith('http')) return content; // Already uploaded
    
    if (uploadCache.has(content)) {
      return uploadCache.get(content);
    }
    
    const url = await uploadToCloudinary(content);
    uploadCache.set(content, url);
    return url;
  };

  const imageKeys = ['cover', 'kitchen', 'bathroom', 'bedroom', 'livingRoom', 'exterior'];

  // Upload specific field images
  for (const key of imageKeys) {
    if (images[key]) {
      uploadedImages[key] = await getUploadedUrl(images[key]);
    }
  }

  // Upload gallery images and ensure uniqueness
  if (Array.isArray(images.gallery)) {
    for (const img of images.gallery) {
      const url = await getUploadedUrl(img);
      if (url && !uploadedImages.gallery.includes(url)) {
        uploadedImages.gallery.push(url);
      }
    }
  }

  return uploadedImages;
};

/**
 * Create a new property
 * @param {Object} propertyBody
 * @returns {Promise<Property>}
 */
const createProperty = async (propertyBody) => {
  const filteredBody = pickAllowedPropertyFields(propertyBody);
  
  if (filteredBody.images) {
    filteredBody.images = await uploadPropertyImages(filteredBody.images);
  }

  return Property.create({
    ...filteredBody,
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
  const filteredBody = pickAllowedPropertyFields(updateBody);

  if (filteredBody.images) {
    filteredBody.images = await uploadPropertyImages(filteredBody.images);
  }

  Object.assign(property, filteredBody);
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
