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

router.post("/send-otp", otpSendLimiter, sendSignupOtp); // creates in auth.js and sends via sendOTP in utils
router.post("/verify-otp", otpVerifyLimiter, verifyOTP);
router.post("/signup", signupLimiter, signUp);
router.post("/login", loginLimiter, login);
router.get("/logout", logout);
router.get("/verify", verifyToken);
router.post("/demo-login", demoLogin); // Demo account generation & login
router.post("/demo", demoLogin); // Alias for demo account generation & login
router.get("/demo-login", demoLogin);
router.get("/demo", demoLogin);

module.exports = router;
