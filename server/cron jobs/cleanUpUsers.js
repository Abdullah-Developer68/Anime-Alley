const userModel = require("../models/user.model.js");

/**
 * Cleanup Unverified Users
 * Deletes users with accountStatus "verifying" that were created more than 7 days ago
 * This function is now called via API endpoint by Vercel Cron Jobs
 */
async function cleanupUnverifiedUsers() {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    const result = await userModel.deleteMany({
      accountStatus: "verifying",
      createdAt: { $lt: oneWeekAgo },
    });

    console.log(`[CLEANUP] Deleted ${result.deletedCount} unverified users`);
    return result;
  } catch (err) {
    console.error("[CLEANUP] Error deleting unverified users:", err);
    throw err;
  }
}

module.exports = cleanupUnverifiedUsers;
