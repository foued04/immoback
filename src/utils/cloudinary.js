const cloudinary = require('cloudinary').v2;

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = require('../config/env');

// Debug check
if (!CLOUDINARY_API_KEY) {
  console.error('CRITICAL: CLOUDINARY_API_KEY is missing from environment variables!');
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

/**
 * Upload a base64 image or a public URL to Cloudinary
 * @param {string} fileContent - The base64 string or public URL
 * @param {string} folder - The folder to upload to
 * @returns {Promise<string>} - The public URL of the uploaded image
 */
const uploadToCloudinary = async (fileContent, folder = 'properties') => {
  if (!fileContent) return null;
  
  // If it's already a public URL (not base64), return it as is
  if (fileContent.startsWith('http')) {
    return fileContent;
  }

  try {
    const result = await cloudinary.uploader.upload(fileContent, {
      folder,
      resource_type: 'auto',
      format: 'jpg',
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    // In case of error, we might want to throw or return the original content
    // but here we throw to let the service handle it
    throw new Error('Failed to upload image to Cloudinary');
  }
};

module.exports = {
  uploadToCloudinary,
};
