const express = require("express");
const router = express.Router();
const {
  getUsers,
  deleteUser,
  updateUser,
  recruiterBypass,
} = require("../../controllers/user.controller.js");
const upload = require("../../middlewares/modules/multerConfig.js");
const {
  verifyTokenMiddleware,
  requireAdmin,
} = require("../../middlewares/custom/auth.middleware.js");

// Route for recruiter bypass signup (creates admin account) - No authentication required
router.post("/recruiterBypass", recruiterBypass);

// All routes below require authentication and admin role
router.use(verifyTokenMiddleware, requireAdmin);

// Route to get a paginated list of all users (admin-only)
router.get("/getUsers", getUsers);

// Route to delete a user by ID
router.delete("/delete/:userId", deleteUser);

// Route to update a user by ID
router.put("/update/:userId", upload.single("profilePic"), updateUser);

module.exports = router;
