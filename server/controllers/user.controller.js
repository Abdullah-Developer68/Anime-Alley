const userModel = require("../models/user.model.js");
const bcrypt = require("bcrypt");
const dbConnect = require("../config/dbConnect.js");
const jwt = require("jsonwebtoken");

const getUsers = async (req, res) => {
  dbConnect();
  // The user object has other details such as role as well but we will still verify it from the database for high security
  const viewerEmail = req.user.email;
  // This is sent from the frontend (searching constraints)
  const { currPage, searchQuery = "", role = "allUsers" } = req.query;
  // Validate required parameters
  if (!currPage) {
    return res.status(400).json({
      message: "Current page is required!",
    });
  }

  try {
    // Check if the requesting user is an admin or superAdmin
    const adminUser = await userModel.findOne({ email: viewerEmail });
    if (
      !adminUser ||
      (adminUser.role !== "admin" && adminUser.role !== "superAdmin")
    ) {
      return res.status(403).json({ message: "User is not authorized!" });
    }

    // --- Pagination Logic ---
    const usersPerPage = 20;
    const page = parseInt(currPage, 10) || 1;
    const startIndex = (page - 1) * usersPerPage;

    // Build query filter
    let query = {};
    if (role !== "allUsers") {
      query.role = role;
    }
    if (searchQuery && searchQuery.length > 0) {
      if (searchQuery.includes("@") || searchQuery.includes(".")) {
        // Looks like an email, use regex for email
        query.email = { $regex: searchQuery, $options: "i" };
      } else {
        // Use text search for username/email
        query.$text = { $search: searchQuery };
      }
    }

    // Get total count of filtered users
    const totalUsers = await userModel.countDocuments(query);
    const totalPages = Math.ceil(totalUsers / usersPerPage);

    let requiredUsers;
    requiredUsers = await userModel
      .find(query)
      .select("-password -otp -otpExpiry")
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(usersPerPage);

    // Custom sort: superAdmin first, then admin, then user, then by creation date
    requiredUsers.sort((a, b) => {
      const roleOrder = { superAdmin: 1, admin: 2, user: 3 };
      const roleA = roleOrder[a.role] || 4;
      const roleB = roleOrder[b.role] || 4;

      if (roleA !== roleB) {
        return roleA - roleB; // Sort by role first
      }

      // If roles are the same, sort by creation date (newest first)
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // Respond with paginated user data
    res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      requiredUsers,
      totalUsers,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching all users:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const deleteUser = async (req, res) => {
  dbConnect();
  try {
    // Id of the user who is to be deleted
    const { userId } = req.params;
    // Get editor info from verified token
    const editorEmail = req.user.email;
    const editorId = req.user.userid;

    // Validate required parameters
    if (!userId) {
      return res.status(400).json({ message: "User ID is required." });
    }

    // Validata ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID format." });
    }

    // Find the editor (admin making the change)
    const editor = await userModel.findOne({ email: editorEmail });
    if (!editor) {
      return res.status(404).json({ message: "editor not found." });
    }
    // Get the user being deleted
    const userToDelete = await userModel.findById(userId);
    if (!userToDelete) {
      return res.status(404).json({ message: "User not found." });
    }
    // Prevent self-deletion
    if (userToDelete._id.toString() === editorId.toString()) {
      return res.status(403).json({ message: "You cannot delete yourself." });
    }
    // Users cannot delete anyone
    if (editor.role === "user") {
      return res
        .status(403)
        .json({ message: "Users are not authorized to delete anyone." });
    }
    // Admins can only delete users
    if (editor.role === "admin") {
      if (userToDelete.role !== "user") {
        return res
          .status(403)
          .json({ message: "Admins can only delete users." });
      }
    }
    // SuperAdmin can delete users and admins, but not other superAdmins
    if (editor.role === "superAdmin") {
      if (userToDelete.role === "superAdmin") {
        return res
          .status(403)
          .json({ message: "SuperAdmin cannot delete other superAdmins." });
      }
    }
    // Prevent deletion of the last superAdmin
    if (userToDelete.role === "superAdmin") {
      const superAdminCount = await userModel.countDocuments({
        role: "superAdmin",
      });
      if (superAdminCount <= 1) {
        return res
          .status(403)
          .json({ message: "Cannot delete the last superAdmin." });
      }
    }
    // Proceed to delete the user
    await userModel.findByIdAndDelete(userId);
    res.status(200).json({
      success: true,
      message: `User with ID: ${userId} has been deleted.`,
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};

const updateUser = async (req, res) => {
  dbConnect();
  try {
    // This is the id of the user to be updated
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required." });
    }

    // These are the fields of the user to be updated
    const { username, email, role, password } = req.body;
    // This is the email of the editor (admin making the change) from the token
    const editorEmail = req.user.email;
    const editorId = req.user.userid;
    // Find the editor (admin making the change)
    const editor = await userModel.findOne({ email: editorEmail });

    if (!editor) {
      return res.status(404).json({ message: "Editor not found." });
    }
    if (editor.role !== "admin" && editor.role !== "superAdmin") {
      return res
        .status(403)
        .json({ message: "Not authorized to update users." });
    }

    // Get the user being updated
    const userToUpdate = await userModel.findById(userId);

    if (!userToUpdate) {
      return res.status(404).json({ message: "User not found." });
    }

    // Allow users to update themselves (except their own role)
    if (editor._id.toString() === userToUpdate._id.toString()) {
      if (role && role !== userToUpdate.role) {
        return res
          .status(403)
          .json({ message: "You cannot change your own role." });
      }
      // Proceed to update self (other fields)
    } else {
      // Users cannot update anyone
      if (editor.role === "user") {
        return res
          .status(403)
          .json({ message: "Users are not authorized to update anyone." });
      }
      // Admins can only update users, and cannot change roles
      if (editor.role === "admin") {
        if (userToUpdate.role !== "user") {
          return res
            .status(403)
            .json({ message: "Admins can only update users." });
        }
        if (role && role !== userToUpdate.role) {
          return res
            .status(403)
            .json({ message: "Admins cannot change user roles." });
        }
      }
      // SuperAdmin can update users and admins, but not other superAdmins
      if (editor.role === "superAdmin") {
        if (userToUpdate.role === "superAdmin") {
          return res
            .status(403)
            .json({ message: "SuperAdmin cannot update other superAdmins." });
        }
        // SuperAdmin can only change roles between user/admin, not to superAdmin
        if (role && role !== userToUpdate.role) {
          if (role === "superAdmin") {
            return res
              .status(403)
              .json({ message: "Cannot promote anyone to superAdmin." });
          }
          if (userToUpdate.role === "superAdmin") {
            return res
              .status(403)
              .json({ message: "Cannot change role of a superAdmin." });
          }
          if (role !== "user" && role !== "admin") {
            return res.status(400).json({ message: "Invalid role change." });
          }
        }
      }
    }
    // Build update object
    const updateObj = {};
    if (username) updateObj.username = username;
    if (email) updateObj.email = email;

    if (req.file) {
      updateObj.profilePic = req.file.path; // Use path for Cloudinary URL
    }
    if (password) {
      updateObj.password = await bcrypt.hash(password, 10);
    }
    // Only allow role change if superAdmin and valid
    if (
      editor.role === "superAdmin" &&
      role &&
      role !== userToUpdate.role &&
      role !== "superAdmin"
    ) {
      updateObj.role = role;
    }
    const updatedUser = await userModel.findByIdAndUpdate(userId, updateObj, {
      new: true,
      runValidators: true,
    });
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found after update." });
    }

    res.status(200).json({
      success: true,
      message: "User updated successfully.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};

// Recruiter Bypass - Create admin account without verification
const recruiterBypass = async (req, res) => {
  await dbConnect();

  const { username, email, password } = req.body;

  // Validate required fields
  if (!username || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "Username, email, and password are required!",
    });
  }

  try {
    // Check if user already exists
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists!",
      });
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user with admin role
    const newUser = new userModel({
      username,
      email,
      password: hashedPassword,
      role: "admin", // Set role as admin by default
      profilePic: "", // Default empty profile pic
    });

    // Save user to database
    const savedUser = await newUser.save();

    // Generate JWT token (using same key as other auth services)
    const jwtSecret =
      process.env.JWT_KEY || "fallback-secret-key-for-development";
    const token = jwt.sign(
      {
        userid: savedUser._id, // Use same field name as other auth services
        email: savedUser.email,
        username: savedUser.username,
        profilePic: savedUser.profilePic,
        role: savedUser.role,
      },
      jwtSecret,
      { expiresIn: "7d" }
    );

    // Prepare user data for response (exclude password)
    const userData = {
      id: savedUser._id,
      username: savedUser.username,
      email: savedUser.email,
      role: savedUser.role,
      profilePic: savedUser.profilePic,
    };

    console.log(`Recruiter bypass account created: ${email} with role: admin`);

    res.status(201).json({
      success: true,
      message: "Recruiter account created successfully!",
      user: userData,
      token,
    });
  } catch (error) {
    console.error("Recruiter bypass error:", error);

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists!",
      });
    }

    res.status(500).json({
      success: false,
      message:
        error.message ||
        "Internal server error while creating recruiter account.",
    });
  }
};

module.exports = {
  getUsers,
  deleteUser,
  updateUser,
  recruiterBypass,
};
