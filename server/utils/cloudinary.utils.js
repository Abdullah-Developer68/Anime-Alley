const cloudinary = require("../config/cloudinary/cloudinary.config.js");

/**
 * Extract Cloudinary public_id from a Cloudinary image URL.
 * Works for URLs like:
 * https://res.cloudinary.com/<cloud>/image/upload/v1234/anime-alley-products/abc123.jpg
 */
const extractPublicIdFromCloudinaryUrl = (url) => {
  if (!url || typeof url !== "string") return null;

  const uploadPart = url.split("/upload/")[1];
  if (!uploadPart) return null;

  const withoutVersion = uploadPart.replace(/^v\d+\//, "");
  const withoutExtension = withoutVersion.replace(/\.[^.]+$/, "");

  return decodeURIComponent(withoutExtension);
};

const destroyCloudinaryImage = async (imageUrl, imagePublicId = null) => {
  const publicId = imagePublicId || extractPublicIdFromCloudinaryUrl(imageUrl);

  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId, { invalidate: true });
  } catch (error) {
    console.error(`Cloudinary cleanup failed for ${publicId}:`, error.message);
  }
};

module.exports = {
  extractPublicIdFromCloudinaryUrl,
  destroyCloudinaryImage,
};
