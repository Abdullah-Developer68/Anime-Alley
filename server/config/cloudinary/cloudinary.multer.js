const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("./cloudinary.config.js");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary, // This is all the config
  params: {
    folder: "anime-alley-products",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    // If the image is larger than the specified dimensions then crop: "limit"
    //  will resize them to fit in 800 x 800 without affecting the aspect ratio
    transformation: [{ width: 800, height: 800, crop: "limit" }],
  },
});

module.exports = storage;
