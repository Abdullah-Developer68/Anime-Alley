const express = require("express");
const router = express.Router();

const {
  makNSenOTP,
  verifyOTP,
  signUp,
  login,
  logout,
  verifyToken,
} = require("../../services/auth.js");
const { recruiterBypass } = require("../../controllers/user.controller.js");

router.post("/send-otp", makNSenOTP); // creates in auth.js and sends via sendOTP in utils
router.post("/verify-otp", verifyOTP);
router.post("/signup", signUp);
router.post("/login", login);
router.get("/logout", logout);
router.get("/verify", verifyToken);
router.post("/recruiterBypass", recruiterBypass); // Recruiter bypass signup

module.exports = router;
