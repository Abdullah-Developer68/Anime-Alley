const userModel = require("../models/user.model.js");
const reservationModel = require("../models/reservation.model.js");
const productModel = require("../models/product.model.js");

// Cleanup unverified users & expired demo users
// Restores inventory stock for active reservations belonging to users before deletion
// Deletes users with accountStatus "verifying" OR isDemo: true created > 7 days ago
async function cleanupUnverifiedUsers() {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    const expiredUsers = await userModel.find({
      $or: [
        { accountStatus: "verifying", createdAt: { $lt: oneWeekAgo } },
        { isDemo: true, createdAt: { $lt: oneWeekAgo } },
      ],
    });

    const userIds = expiredUsers
      .map((user) => user?._id)
      .filter((userId) => Boolean(userId));

    if (!userIds.length)
      return { deletedCount: 0, restoredReservationsCount: 0 };

    const reservations = await reservationModel.find({
      userId: { $in: userIds },
    });

    for (const reservation of reservations) {
      const products = reservation?.products || [];
      for (const item of products) {
        const { productId, variant, quantity } = item || {};
        const product = await productModel.findById(productId);

        if (product && typeof quantity === "number" && quantity > 0) {
          const category = product?.category?.toLowerCase();
          let updateField = null;

          if (["comics", "clothes", "shoes"].includes(category) && variant) 
            updateField = `stock.${variant}`;
          else if (category === "toys")
             updateField = "stock";

          if (updateField)
            await productModel.updateOne(
              { _id: product._id },
              { $inc: { [updateField]: quantity } },
            );
        }
      }
    }

    await reservationModel.deleteMany({ userId: { $in: userIds } });
    await userModel.deleteMany({ _id: { $in: userIds } });

    console.log(
      `[CLEANUP] Deleted ${userIds.length} unverified/expired demo users and restored ${reservations.length} reservations`,
    );

    return {
      deletedCount: userIds.length,
      restoredReservationsCount: reservations.length,
    };
  } catch (err) {
    console.error("[CLEANUP] Error deleting unverified/demo users:", err);
    throw err;
  }
}

module.exports = cleanupUnverifiedUsers;
