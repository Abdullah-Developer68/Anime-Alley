const express = require("express");
const router = express.Router();
const {
  getUsers,
  deleteUser,
  updateUser,
  recruiterBypass,
} = require("../../controllers/user.controller.js");
const upload = require("../../middlewares/modules/multerConfig.js");

// Route to get a paginated list of all users (admin-only)
router.get("/getUsers", getUsers);

// Route to delete a user by ID
router.delete("/delete/:userId", deleteUser);

// Route to update a user by ID
router.put("/update/:userId", upload.single("profilePic"), updateUser);

// Route for recruiter bypass signup (creates admin account)
router.post("/recruiterBypass", recruiterBypass);

module.exports = router;
