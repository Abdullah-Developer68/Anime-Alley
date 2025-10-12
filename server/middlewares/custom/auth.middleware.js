const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

const verifyTokenMiddleware = async (req, res, next) => {
  try {
    // Extract token from Authorization header or cookies
    let token = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      // Extracts the String (token) after 7th index which is after "Bearer "
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication failed. No token provided",
      });
    }

    // verify token
    const decoded = jwt.verify(token, process.env.JWT_KEY);

    // Attach the decoded data (userInfo) to the request object
    req.user = {
      id: decoded.userid,
      email: decoded.email,
      username: decoded.username,
      role: decoded.role,
      profilePic: decoded.profilePic,
    };
    // Proceed to the next middleware or route handler
    next();
  } catch (error) {
    console.error("Error verifying token:", error);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Token expired" });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

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
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized. No user info found" });
  }

  if (req.user.role !== "superAdmin") {
    return res
      .status(403)
      .json({ success: false, message: "Forbidden. SuperAdmins only" });
  }

  next();
};

module.exports = {
  verifyTokenMiddleware,
  requireAdmin,
  requireSuperAdmin,
};
