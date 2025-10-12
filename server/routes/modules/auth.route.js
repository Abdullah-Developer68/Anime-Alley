const express = require("express");
const router = express.Router();
// Controllers
const {
  makNSenOTP,
  verifyOTP,
  signUp,
  login,
  logout,
  verifyToken,
} = require("../../services/auth.js");
const { recruiterBypass } = require("../../controllers/user.controller.js");
// Rate limiters (middlewares)
const {
  otpSendLimiter,
  otpVerifyLimiter,
  loginLimiter,
  signupLimiter,
} = require("../../middlewares/custom/rateLimit.middleware.js");

router.post("/send-otp", otpSendLimiter, makNSenOTP); // creates in auth.js and sends via sendOTP in utils
router.post("/verify-otp", otpVerifyLimiter, verifyOTP);
router.post("/signup", signupLimiter, signUp);
router.post("/login", loginLimiter, login);
router.get("/logout", logout);
router.get("/verify", verifyToken);
router.post("/recruiterBypass", recruiterBypass); // Recruiter bypass signup

module.exports = router;
