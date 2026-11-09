const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();
const dbConnect = require("../../db/dbConnect.js");
const userModel = require("../../db/models/user.model.js");
const { verifyAccessToken, isSessionActive } = require("../../utils/authSession.utils.js");

const unauthorized = (res, message) => res.status(401).json({ success: false, message });

const verifyTokenMiddleware = async (req, res, next) => {
  // Bearer header only. A cookie fallback would let other sites act as the user (CSRF),
  // because browsers attach cookies to cross-site requests but never add this header.
  const authHeader = req.headers?.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
  if (!token)
    return unauthorized(res, "Authentication failed. No token provided");

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (error) {
    return unauthorized(res, error.name === "TokenExpiredError" ? "Token expired" : "Invalid token");
  }
  if (!mongoose.isValidObjectId(payload.userid) || !mongoose.isValidObjectId(payload.sid))
    return unauthorized(res, "Invalid token");

  try {
    await dbConnect();
    // The token only says who logged in. The role comes from the database, and the session must
    // still exist, so demotions, deletions and logouts take effect on the next request.
    const [user, sessionActive] = await Promise.all([
      userModel
        .findById(payload.userid)
        .select("email username role profilePic isDemo accountStatus")
        .lean(),
      isSessionActive(payload.sid, payload.userid),
    ]);
    if (!user || !sessionActive || user.accountStatus !== "active")
      return unauthorized(res, "Session is no longer valid");

    req.user = {
      id: String(user._id),
      email: user.email,
      username: user.username,
      role: user.role,
      profilePic: user.profilePic,
      isDemo: user.isDemo || false,
      sessionId: payload.sid,
    };
    next();
  } catch (error) {
    console.error("Error verifying token:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Allow admin or superAdmin role
const requireAdmin = (req, res, next) => {
  if (!req.user)
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized. No user info found" });

  if (req.user?.role !== "admin" && req.user?.role !== "superAdmin")
    return res
      .status(403)
      .json({ success: false, message: "Forbidden. Admins only" });

  next();
};

// Allow superAdmin role only
const requireSuperAdmin = (req, res, next) => {
  if (!req.user)
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized. No user info found" });

  if (req.user?.role !== "superAdmin")
    return res
      .status(403)
      .json({ success: false, message: "Forbidden. SuperAdmins only" });

  next();
};

module.exports = {
  verifyTokenMiddleware,
  requireAdmin,
  requireSuperAdmin,
};
