const express = require("express");
const router = express.Router();
const {
  getUsers,
  deleteUser,
  updateUser,
} = require("../../controllers/user.controller.js");
const upload = require("../../middlewares/modules/multerConfig.js");
const {
  verifyTokenMiddleware,
  requireAdmin,
} = require("../../middlewares/custom/auth.middleware.js");

// All routes below require authentication and admin role
router.use(verifyTokenMiddleware, requireAdmin);

router.get("/", getUsers);
router.patch("/:userId", upload.single("profilePic"), updateUser);
router.delete("/:userId", deleteUser);

module.exports = router;
