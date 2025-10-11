// Allow admin or superAdmin role
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized. No user info found" });
  }

  if (req.user.role !== "admin" && req.user.role !== "superAdmin") {
    return res
      .status(403)
      .json({ success: false, message: "Forbidden. Admins only" });
  }

  next();
};

// Allow superAdmin role only
const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized. No user info found" });
  }

  if (req.user.role !== "superAdmin") {
    return res.status(403).json({ success: false, message: "Forbidden. SuperAdmins only" });
  }

  next();
};

module.exports = {
  requireAdmin,
  requireSuperAdmin,
};
