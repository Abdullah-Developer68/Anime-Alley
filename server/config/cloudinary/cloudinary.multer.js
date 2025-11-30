const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("./cloudinary.config.js");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "anime-alley-products",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 800, height: 800, crop: "limit" }],
  },
});

module.exports = storage;
