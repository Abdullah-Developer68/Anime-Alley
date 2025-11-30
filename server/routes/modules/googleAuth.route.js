const express = require("express");
const router = express.Router();
const passport = require("../../config/passport/passport.js");

const {
  LogoutFromGoogle,
  initiateGoogleAuth,
  handleGoogleCallback,
  sendUserData,
} = require("../../services/googleAuth.js");

// Route to initiate Google OAuth
router.get("/login", (req, res, next) => {
  // this uses passport.js which returns a middleware, so to execute
  // it immediatly (in googleAuth.js) it is called as a function and wrapped in a route handler
  // to pass the current context because unlike standard express handlers
  // this does not have access to it
  initiateGoogleAuth(req, res, next);
});

// Google OAuth callback route
router.get("/callback", (req, res, next) => {
  // same reason as initiateGoogleAuth
  handleGoogleCallback(req, res, next);
});

// Logout route
router.get("/logout", LogoutFromGoogle);

// Route to check authentication status and get user data
router.get("/success", sendUserData);

// Failed authentication route
router.get("/failed", (req, res) => {
  res.status(401).json({ success: false, message: "Failed to authenticate" });
});

module.exports = router;
