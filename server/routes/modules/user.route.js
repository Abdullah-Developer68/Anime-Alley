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

// All routes below require authentication and admin role
router.use(verifyTokenMiddleware, requireAdmin);

router.get("/", getUsers);
router.patch("/:userId", upload.single("profilePic"), rejectOperatorKeys, updateUser);
router.delete("/:userId", deleteUser);

module.exports = router;
