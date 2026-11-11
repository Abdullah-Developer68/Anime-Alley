const multer = require("multer");

// Vercel rejects request bodies over 4.5 MB before they reach the function, so stay under it
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Files stay in memory until the request is validated; the controller uploads them to Cloudinary
// afterwards, so a rejected request never leaves an orphaned image behind
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 20, fieldSize: 100 * 1024 },
  fileFilter: (req, file, callback) => {
    if (IMAGE_TYPES.includes(file.mimetype))
      return callback(null, true);
    callback(Object.assign(new Error("Images must be JPG, PNG or WebP."), { code: "UNSUPPORTED_TYPE" }));
  },
});

const UPLOAD_MESSAGES = {
  LIMIT_FILE_SIZE: "Images must be 4 MB or smaller.",
  UNSUPPORTED_TYPE: "Images must be JPG, PNG or WebP.",
};

// upload.single() with upload problems answered as 400s instead of reaching the 500 handler
const singleImage = (field) => (req, res, next) =>
  upload.single(field)(req, res, (error) => {
    if (!error)
      return next();
    res.status(400).json({ success: false, message: UPLOAD_MESSAGES[error.code] || "Invalid upload." });
  });

module.exports = { singleImage };
