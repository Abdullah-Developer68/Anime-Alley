const express = require("express");
const router = express.Router();
const {
  cleanupUnverifiedUsers,
  cleanupReservations,
  healthCheck,
} = require("../../controllers/cleanup.controller.js");

/**
 * Cleanup Routes
 * These endpoints are designed to be called by Vercel Cron Jobs
 *
 * Security Note: In production, you should add authentication/authorization
 * or verify that requests come from Vercel Cron Jobs using a secret token
 */

// Health check endpoint for monitoring
router.get("/health", healthCheck);

// Cleanup unverified users (called by cron job)
router.post("/users", cleanupUnverifiedUsers);

// Cleanup expired reservations (called by cron job)
router.post("/reservations", cleanupReservations);

module.exports = router;
