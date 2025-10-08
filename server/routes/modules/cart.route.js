const express = require("express");
const router = express.Router();
const {
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} = require("../../controllers/reservation.controller.js");

// JWT middleware to extract user info
const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  try {
    // First, try to get token from Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    let token;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    } else {
      // Fallback to cookie-based token
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required for cart operations",
      });
    }

    // Verify and decode the JWT token
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid authentication token",
    });
  }
};

// All cart routes require authentication (middleware applied here)
router.use(verifyToken);

router.post("/", getCart);
router.put("/update", updateCartItem);
router.delete("/remove", removeFromCart);
router.delete("/clear", clearCart);

module.exports = router;
