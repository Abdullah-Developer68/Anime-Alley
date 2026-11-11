const userModel = require("../db/models/user.model.js");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const dbConnect = require("../db/dbConnect.js");
const {
  uploadImage,
  destroyCloudinaryImage,
} = require("../utils/cloudinary.utils.js");
const {
  isOptionalString,
  escapeRegex,
  normalizeEmail,
  isValidEmail,
  passwordProblem,
  usernameProblem,
  parsePage,
} = require("../utils/validation.utils.js");
const { revokeUserSessions } = require("../utils/authSession.utils.js");
const { clientError } = require("../utils/errors.utils.js");
const { maskEmail, maskText } = require("../utils/privacy.utils.js");

const USER_ROLE_FILTERS = ["allUsers", "user", "admin", "superAdmin"];
const MAX_SEARCH_LENGTH = 100;
const USERS_PER_PAGE = 20;
// The only user fields an admin response ever contains; never the password hash, OTP or Google ID
const SAFE_USER_FIELDS = "username email role profilePic accountStatus isDemo createdAt";
const ROLE_ORDER = { superAdmin: 1, admin: 2, user: 3 };

const getUsers = async (req, res) => {
  try {
    const { searchQuery = "", role = "allUsers" } = req.query || {};
    const page = parsePage(req.query?.currPage);
    const viewer = req.user;

    if (!page)
      return res.status(400).json({ success: false, message: "Current page must be a positive integer" });
    if (typeof searchQuery !== "string" || searchQuery.length > MAX_SEARCH_LENGTH)
      return res.status(400).json({ success: false, message: `Search must be text of at most ${MAX_SEARCH_LENGTH} characters.` });
    if (!USER_ROLE_FILTERS.includes(role))
      return res.status(400).json({ success: false, message: "Invalid role filter." });
    // Search results would confirm whether an email has an account, even with the details masked
    if (viewer?.isDemo && searchQuery.trim())
      return res.status(403).json({ success: false, message: "Search is disabled for demo accounts." });

    await dbConnect();

    // requireAdmin has already checked the role from the database
    const query = {};
    if (role !== "allUsers")
      query.role = role;
    const search = searchQuery.trim();
    if (search) {
      if (search.includes("@") || search.includes("."))
        // Escaped, so the search is plain text and can't be a slow or invalid regex
        query.email = { $regex: escapeRegex(search), $options: "i" };
      else
        query.$text = { $search: search };
    }

    const [totalUsers, users] = await Promise.all([
      userModel.countDocuments(query),
      userModel
        .find(query)
        .select(SAFE_USER_FIELDS)
        .sort({ createdAt: -1 })
        .skip((page - 1) * USERS_PER_PAGE)
        .limit(USERS_PER_PAGE)
        .lean(),
    ]);

    // superAdmin first, then admin, then user; newest first within a role
    users.sort((a, b) => (ROLE_ORDER[a.role] || 4) - (ROLE_ORDER[b.role] || 4) || new Date(b.createdAt) - new Date(a.createdAt));

    // Demo admins see other people's names and emails masked
    const requiredUsers = viewer?.isDemo
      ? users.map((user) =>
        String(user._id) === viewer.id || user.isDemo
          ? user
          : { ...user, email: maskEmail(user.email), username: maskText(user.username) })
      : users;

    res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      requiredUsers,
      totalUsers,
      totalPages: Math.ceil(totalUsers / USERS_PER_PAGE),
    });
  } catch (error) {
    console.error("Error fetching all users:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const userId = req.params?.userId;
    const editor = req.user;

    if (!mongoose.isValidObjectId(userId))
      return res.status(400).json({ success: false, message: "Invalid User ID format." });
    if (userId === editor.id)
      return res.status(403).json({ success: false, message: "You cannot delete yourself." });

    await dbConnect();

    const userToDelete = await userModel.findById(userId).select("role profilePic profilePicPublicId").lean();
    if (!userToDelete)
      return res.status(404).json({ success: false, message: "User not found." });
    // Admins can only delete users; superAdmins can delete users and admins, never other superAdmins
    if (editor.role === "admin" && userToDelete.role !== "user")
      return res.status(403).json({ success: false, message: "Admins can only delete users." });
    if (userToDelete.role === "superAdmin")
      return res.status(403).json({ success: false, message: "SuperAdmins cannot be deleted." });

    const deleted = await userModel.deleteOne({ _id: userId });
    if (deleted.deletedCount === 0)
      return res.status(404).json({ success: false, message: "User not found or already deleted." });
    await revokeUserSessions(userId);

    if (userToDelete.profilePicPublicId)
      await destroyCloudinaryImage(userToDelete.profilePic, userToDelete.profilePicPublicId);

    res.status(200).json({ success: true, message: "User has been deleted." });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// Who may edit whom, and which fields. Returns an error message, or null when allowed.
const editProblem = ({ editor, target, isSelf, role, email, password }) => {
  if (isSelf)
    return role && role !== target.role ? "You cannot change your own role." : null;
  // Changing someone's login details would let an admin take over their account
  if (email || password)
    return "Admins can't change another user's email or password.";
  if (editor.role === "admin") {
    if (target.role !== "user")
      return "Admins can only update users.";
    return role && role !== target.role ? "Admins cannot change user roles." : null;
  }
  if (target.role === "superAdmin")
    return "SuperAdmin cannot update other superAdmins.";
  if (role && role !== target.role && role !== "user" && role !== "admin")
    return "Roles can only be changed between user and admin.";
  return null;
};

const updateUser = async (req, res) => {
  try {
    const userId = req.params?.userId;
    const editor = req.user;
    const { username, role } = req.body || {};
    const password = req.body?.password || "";
    const email = req.body?.email ? normalizeEmail(req.body.email) : "";

    if (!mongoose.isValidObjectId(userId))
      return res.status(400).json({ success: false, message: "Invalid User ID format." });
    if (![username, role, req.body?.email, req.body?.password].every(isOptionalString))
      return res.status(400).json({ success: false, message: "Username, email, role and password must be strings." });

    // An empty field means "keep the current value"
    const invalidField =
      (username && usernameProblem(username)) ||
      (password && passwordProblem(password)) ||
      (email && !isValidEmail(email) && "Enter a valid email address.");
    if (invalidField)
      return res.status(400).json({ success: false, message: invalidField });

    await dbConnect();

    const target = await userModel.findById(userId).select("role email profilePic profilePicPublicId").lean();
    if (!target)
      return res.status(404).json({ success: false, message: "User not found." });

    const isSelf = String(target._id) === editor.id;
    const changedEmail = email && email !== target.email ? email : "";
    const forbidden = editProblem({ editor, target, isSelf, role, email: changedEmail, password });
    if (forbidden)
      return res.status(403).json({ success: false, message: forbidden });

    const update = {};
    if (username)
      update.username = username.trim();
    if (changedEmail)
      update.email = changedEmail;
    if (password)
      update.password = await bcrypt.hash(password, 10);
    if (editor.role === "superAdmin" && !isSelf && role && role !== target.role)
      update.role = role;

    // Uploaded only now that the request is known to be valid
    if (req.file) {
      const uploaded = await uploadImage(req.file.buffer, { folder: `anime-alley-users/${userId}`, maxSize: 500 });
      update.profilePic = uploaded.url;
      update.profilePicPublicId = uploaded.publicId;
    }

    const updatedUser = await userModel
      .findByIdAndUpdate(userId, update, { new: true, runValidators: true })
      .select(SAFE_USER_FIELDS)
      .lean();
    if (!updatedUser)
      return res.status(404).json({ success: false, message: "User not found after update." });

    // A new password logs the user out on every other device
    if (password)
      await revokeUserSessions(userId, isSelf ? editor.sessionId : undefined);

    if (req.file && target.profilePicPublicId)
      await destroyCloudinaryImage(target.profilePic, target.profilePicPublicId);

    res.status(200).json({ success: true, message: "User updated successfully.", user: updatedUser });
  } catch (error) {
    // Duplicate or invalid data gets a safe 409/400 instead of the raw database error
    const known = clientError(error);
    if (known)
      return res.status(known.status).json({ success: false, message: known.message });

    console.error("Error updating user:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

module.exports = {
  getUsers,
  deleteUser,
  updateUser,
};
