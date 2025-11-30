const userModel = require("../models/user.model.js");
const cleanupExpiredReservations = require("../utils/cleanUpReservation.js");
const dbConnect = require("../config/dbConnect.js");

/**
 * Cleanup Unverified Users
 * Deletes users with role "verifying" that were created more than 7 days ago
 * This should be called by a Vercel Cron Job
 */
const cleanupUnverifiedUsers = async (req, res) => {
  try {
    await dbConnect();

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const result = await userModel.deleteMany({
      role: "verifying",
      createdAt: { $lt: oneWeekAgo },
    });

    console.log(`[CLEANUP] Deleted ${result.deletedCount} unverified users`);

    return res.status(200).json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} unverified users`,
      deletedCount: result.deletedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[CLEANUP] Error deleting unverified users:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to cleanup unverified users",
      error: err.message,
    });
  }
};

/**
 * Cleanup Expired Reservations
 * Restores product stock from reservations older than 2 days
 * This should be called by a Vercel Cron Job
 */
const cleanupReservations = async (req, res) => {
  try {
    await dbConnect();

    await cleanupExpiredReservations();

    console.log("[CLEANUP] Successfully cleaned up expired reservations");

    return res.status(200).json({
      success: true,
      message: "Successfully cleaned up expired reservations",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[CLEANUP] Error cleaning up expired reservations:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to cleanup expired reservations",
      error: error.message,
    });
  }
};

/**
 * Health Check Endpoint for Cron Jobs
 * Verifies that the cleanup service is responsive
 */
const healthCheck = async (req, res) => {
  try {
    await dbConnect();

    return res.status(200).json({
      success: true,
      message: "Cleanup service is healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: "connected",
        users: "ready",
        reservations: "ready",
      },
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      message: "Cleanup service is unhealthy",
      error: error.message,
    });
  }
};

module.exports = {
  cleanupUnverifiedUsers,
  cleanupReservations,
  healthCheck,
};
