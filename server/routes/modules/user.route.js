const express = require("express");
const router = express.Router();
const {
  getUsers,
  deleteUser,
  updateUser,
} = require("../../controllers/user.controller.js");
const upload = require("../../middlewares/modules/multerConfig.js");
// Multipart bodies are parsed after the app-wide check, so they are checked again after multer
const { rejectOperatorKeys } = require("../../middlewares/custom/rejectOperators.middleware.js");
const {
  verifyTokenMiddleware,
  requireAdmin,
} = require("../../middlewares/custom/auth.middleware.js");
const {
  adminWriteLimiter,
} = require("../../middlewares/custom/rateLimiters.middleware.js");

// All routes below require authentication and admin role
router.use(verifyTokenMiddleware, requireAdmin);

router.get("/", getUsers);
// Limited before multer, so a blocked request never uploads its image
router.patch("/:userId", adminWriteLimiter, upload.single("profilePic"), rejectOperatorKeys, updateUser);
router.delete("/:userId", adminWriteLimiter, deleteUser);

module.exports = router;
