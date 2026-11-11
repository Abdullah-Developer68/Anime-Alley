// Loaded on first use: most requests never touch images, and the SDK slows every cold start
let client = null;
const getCloudinary = () => {
  if (!client) {
    client = require("cloudinary").v2;
    client.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }
  return client;
};

const IMAGE_FORMATS = ["jpg", "jpeg", "png", "webp"];

// Uploads an image held in memory (see multerConfig.js); returns its URL and public ID
const uploadImage = (buffer, { folder, maxSize }) =>
  new Promise((resolve, reject) => {
    const stream = getCloudinary().uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        allowed_formats: IMAGE_FORMATS,
        transformation: [{ width: maxSize, height: maxSize, crop: "limit" }],
      },
      (error, result) => (error ? reject(error) : resolve({ url: result.secure_url, publicId: result.public_id })),
    );
    stream.end(buffer);
  });

// Extract Cloudinary public_id from a Cloudinary image URL, e.g.
// https://res.cloudinary.com/<cloud>/image/upload/v1234/anime-alley-products/abc123.jpg
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
    await getCloudinary().uploader.destroy(publicId, { invalidate: true });
  } catch (error) {
    console.error(`Cloudinary cleanup failed for ${publicId}:`, error.message);
  }
};

module.exports = {
  uploadImage,
  extractPublicIdFromCloudinaryUrl,
  destroyCloudinaryImage,
};
