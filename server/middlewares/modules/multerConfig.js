const multer = require("multer");
const storage = require("../../config/cloudinary/cloudinary.multer.js");

const upload = multer({ storage }); // this is using cloud storage

module.exports = upload;
