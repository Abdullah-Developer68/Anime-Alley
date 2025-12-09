const cleanupUnverifiedUsers = require("../cron jobs/cleanUpUsers.js");
const cleanupExpiredReservations = require("../cron jobs/cleanUpReservation.js");
const dbConnect = require("../config/dbConnect.js");

/**
 * Cleanup Unverified Users Controller
 * HTTP endpoint wrapper for the cleanup utility function
 */
const cleanupUnverifiedUsersController = async (req, res) => {
  try {
    await dbConnect();
    const result = await cleanupUnverifiedUsers();

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
 * Cleanup Expired Reservations Controller
 * HTTP endpoint wrapper for the cleanup utility function
 */
const cleanupReservationsController = async (req, res) => {
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

module.exports = {
  cleanupUnverifiedUsersController,
  cleanupReservationsController,
};
