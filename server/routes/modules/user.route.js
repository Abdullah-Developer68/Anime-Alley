const express = require("express");
const router = express.Router();
const {
  getUsers,
  deleteUser,
  updateUser,
} = require("../../controllers/user.controller.js");
const { singleImage } = require("../../middlewares/modules/multerConfig.js");
const { blockDemoWrites } = require("../../middlewares/custom/demo.middleware.js");
// Multipart bodies are parsed after the app-wide check, so they are checked again after multer
const { rejectOperatorKeys } = require("../../middlewares/custom/rejectOperators.middleware.js");
const {
  verifyTokenMiddleware,
  requireAdmin,
} = require("../../middlewares/custom/auth.middleware.js");
const {
  adminWriteLimiter,
} = require("../../middlewares/custom/rateLimiters.middleware.js");

// All routes below require authentication and admin role; demo accounts may only read
router.use(verifyTokenMiddleware, requireAdmin, blockDemoWrites);

router.get("/", getUsers);
// Limited before multer, so a blocked request never gets its file parsed
router.patch("/:userId", adminWriteLimiter, singleImage("profilePic"), rejectOperatorKeys, updateUser);
router.delete("/:userId", adminWriteLimiter, deleteUser);

module.exports = router;
