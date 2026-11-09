const express = require("express");
const router = express.Router();
// Controllers
const {
  sendSignupOtp,
  verifyOTP,
  signUp,
  login,
  logout,
  refreshAccessToken,
  getCurrentUser,
  demoLogin,
} = require("../../services/auth.js");
const { verifyTokenMiddleware } = require("../../middlewares/custom/auth.middleware.js");
// Rate limiters (middlewares)
const {
  otpSendLimiter,
  otpVerifyLimiter,
  loginLimiter,
  signupLimiter,
  demoLoginLimiter,
  sessionLimiter,
} = require("../../middlewares/custom/rateLimiters.middleware.js");

router.post("/otp", otpSendLimiter, sendSignupOtp);
router.post("/otp/verify", otpVerifyLimiter, verifyOTP);
router.post("/signup", signupLimiter, signUp);
router.post("/login", loginLimiter, login);
// Logout and refresh take the refresh token, so they work after the access token has expired
router.post("/logout", sessionLimiter, logout);
router.post("/refresh", sessionLimiter, refreshAccessToken);
router.get("/me", verifyTokenMiddleware, getCurrentUser);
router.post("/demo-login", demoLoginLimiter, demoLogin);

module.exports = router;
