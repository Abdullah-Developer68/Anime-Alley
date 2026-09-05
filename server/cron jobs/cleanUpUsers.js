const mongoose = require("mongoose");
const userModel = require("../models/user.model.js");
const reservationModel = require("../models/reservation.model.js");
const productModel = require("../models/product.model.js");

// Cleanup unverified users & expired demo users
// Restores inventory stock for active reservations belonging to users before deletion
// Deletes users with accountStatus "verifying" OR isDemo: true created > 7 days ago
async function cleanupUnverifiedUsers() {
  const mongoSession = await mongoose.startSession();

  try {
    mongoSession.startTransaction();

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const expiredUsers = await userModel
      .find({
        $or: [
          { accountStatus: "verifying", createdAt: { $lt: oneWeekAgo } },
          { isDemo: true, createdAt: { $lt: oneWeekAgo } },
        ],
      })
      .session(mongoSession);

    const userIds = expiredUsers
      .map((user) => user?._id)
      .filter((userId) => Boolean(userId));

    if (!userIds.length) {
      await mongoSession.commitTransaction();
      return { deletedCount: 0, restoredReservationsCount: 0 };
    }

    const reservations = await reservationModel
      .find({ userId: { $in: userIds } })
      .session(mongoSession);

    if (reservations.length > 0) {
      // Collect deduplicated referenced product IDs across all reservations
      const productIdsSet = new Set();
      for (const reservation of reservations) {
        const products = reservation?.products || [];
        for (const item of products) {
          const productId = item?.productId?._id || item?.productId;
          if (productId)
            productIdsSet.add(String(productId));
        }
      }

      if (productIdsSet.size > 0) {
        // Prefetch all referenced products in a single database query
        const products = await productModel
          .find({ _id: { $in: Array.from(productIdsSet) } })
          .session(mongoSession);
        const productMap = new Map();
        for (const product of products)
          productMap.set(String(product?._id), product);

        // Aggregate variant stock increments in memory per product and variant
        const variantStockUpdates = new Map();

        for (const reservation of reservations) {
          const productsList = reservation?.products || [];
          for (const item of productsList) {
            const rawProductId = item?.productId?._id || item?.productId;
            const { variant, quantity } = item || {};
            if (!rawProductId || typeof quantity !== "number" || quantity <= 0)
              continue;

            const product = productMap.get(String(rawProductId));
            if (!product)
              continue;

            const variants = Array.isArray(product.variants) ? product.variants : [];
            const isSingleDefault = variants.length === 1 && variants[0]?.label === "Default";
            const targetVariant = variant || (isSingleDefault ? "Default" : null);
            if (!targetVariant)
              continue;

            const variantDoc = variants.find((v) => v.label === targetVariant);
            if (!variantDoc)
              continue;

            const key = `${product._id}::${targetVariant}`;
            variantStockUpdates.set(key, (variantStockUpdates.get(key) || 0) + quantity);
          }
        }

        // Apply batched increments using bulkWrite
        const bulkOps = [];
        for (const [key, qty] of variantStockUpdates.entries()) {
          const [prodId, targetVariant] = key.split("::");
          bulkOps.push({
            updateOne: {
              filter: { _id: prodId, "variants.label": targetVariant },
              update: { $inc: { "variants.$.stock": qty } },
            },
          });
        }

        if (bulkOps.length > 0)
          await productModel.bulkWrite(bulkOps, { session: mongoSession });
      }

      await reservationModel.deleteMany(
        { userId: { $in: userIds } },
        { session: mongoSession },
      );
    }

    await userModel.deleteMany(
      { _id: { $in: userIds } },
      { session: mongoSession },
    );

    await mongoSession.commitTransaction();

    console.log(
      `[CLEANUP] Deleted ${userIds.length} unverified/expired demo users and restored ${reservations.length} reservations`,
    );

    return {
      deletedCount: userIds.length,
      restoredReservationsCount: reservations.length,
    };
  } catch (err) {
    if (mongoSession && (typeof mongoSession.inTransaction === "function" ? mongoSession.inTransaction() : true)) {
      try {
        await mongoSession.abortTransaction();
      } catch (abortErr) {
        console.error("Error aborting transaction:", abortErr);
      }
    }
    console.error("[CLEANUP] Error deleting unverified/demo users:", err);
    throw err;
  } finally {
    if (mongoSession) {
      if (typeof mongoSession.inTransaction === "function" ? mongoSession.inTransaction() : false) {
        try {
          await mongoSession.abortTransaction();
        } catch (abortErr) {
          console.error("Error aborting transaction in finally:", abortErr);
        }
      }
      try {
        await mongoSession.endSession();
      } catch (endErr) {
        console.error("Error ending session:", endErr);
      }
    }
  }
}

module.exports = cleanupUnverifiedUsers;
