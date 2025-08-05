const cron = require("node-cron");
const reservationModel = require("../models/reservation.model.js");
const productModel = require("../models/product.model.js");
const mongoose = require("mongoose");

async function cleanupExpiredReservations() {
  const mongoSession = await mongoose.startSession();

  try {
    mongoSession.startTransaction();

    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const expiredReservations = await reservationModel
      .find({ reservedAt: { $lt: twoDaysAgo } })
      .session(mongoSession);

    for (const reservation of expiredReservations) {
      // Process each product in the reservation
      for (const reservedProduct of reservation.products) {
        const product = await productModel
          .findById(reservedProduct.productId)
          .session(mongoSession);

        if (product) {
          if (
            product.category === "comics" ||
            product.category === "clothes" ||
            product.category === "shoes"
          ) {
            // For variant-based products, restore stock to the specific variant
            const update = {};
            update[`stock.${reservedProduct.variant}`] =
              reservedProduct.quantity;
            await productModel.updateOne(
              { _id: product._id },
              { $inc: update },
              { session: mongoSession }
            );
          } else {
            // For toys, restore to general stock
            await productModel.updateOne(
              { _id: product._id },
              { $inc: { stock: reservedProduct.quantity } },
              { session: mongoSession }
            );
          }
        }
      }

      // Delete the entire reservation after restoring all products
      await reservationModel
        .deleteOne({ _id: reservation._id })
        .session(mongoSession);
    }

    await mongoSession.commitTransaction();
  } catch (error) {
    await mongoSession.abortTransaction();
    console.error("[CLEANUP] Error cleaning up expired reservations:", error);
    throw error;
  } finally {
    mongoSession.endSession();
  }
}

// Schedule cleanup to run every day at 3:00 AM (1 hour after user cleanup)
cron.schedule("0 3 * * *", async () => {
  try {
    await cleanupExpiredReservations();
  } catch (error) {
    console.error("[CLEANUP] Failed to cleanup expired reservations:", error);
  }
});

module.exports = cleanupExpiredReservations;
