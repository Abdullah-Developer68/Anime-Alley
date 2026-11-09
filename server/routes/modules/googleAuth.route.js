const express = require("express");
const router = express.Router();

const {
  initiateGoogleAuth,
  handleGoogleCallback,
  exchangeGoogleCode,
} = require("../../services/googleAuth.js");
const {
  googleAuthLimiter,
} = require("../../middlewares/custom/rateLimiters.middleware.js");

// OAuth browser redirects, not REST resources. The callback path is registered with Google
// (GOOGLE_CALLBACK_URL), so it must not change without updating the Google Cloud console.
router.use(googleAuthLimiter);

router.get("/login", initiateGoogleAuth);
router.get("/callback", handleGoogleCallback);
router.post("/token", exchangeGoogleCode);

module.exports = router;
