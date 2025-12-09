const express = require("express");
const router = express.Router();
const {
  cleanupUnverifiedUsersController,
  cleanupReservationsController,
} = require("../../controllers/cleanup.controller.js");
const { verifyCronSecret } = require("../../middlewares/custom/cron.middleware.js");

// Cleanup Routes
// These endpoints are designed to be called by Vercel Cron Jobs

// Vercel sends a cron secret in the request authorization headers for verification. After verifying execute the cleanup controllers.
router.use(verifyCronSecret);

// Cleanup unverified users (called by cron job)
router.post("/users", cleanupUnverifiedUsersController);

// Cleanup expired reservations (called by cron job)
router.post("/reservations", cleanupReservationsController);

module.exports = router;
