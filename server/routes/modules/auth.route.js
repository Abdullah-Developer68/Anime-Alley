const express = require("express");
const router = express.Router();
// Controllers
const {
  sendSignupOtp,
  verifyOTP,
  signUp,
  login,
  logout,
  verifyToken,
  demoLogin,
} = require("../../services/auth.js");
// Rate limiters (middlewares)
const {
  otpSendLimiter,
  otpVerifyLimiter,
  loginLimiter,
  signupLimiter,
} = require("../../middlewares/custom/rateLimiters.middleware.js");

router.post("/otp", otpSendLimiter, sendSignupOtp);
router.post("/otp/verify", otpVerifyLimiter, verifyOTP);
router.post("/signup", signupLimiter, signUp);
router.post("/login", loginLimiter, login);
router.post("/logout", logout);
router.get("/me", verifyToken);
router.post("/demo-login", demoLogin);

module.exports = router;
