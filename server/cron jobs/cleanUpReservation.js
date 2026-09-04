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
        const { productId, variant, quantity } = reservedProduct || {};
        const product = await productModel
          .findById(productId)
          .session(mongoSession);

        if (product && typeof quantity === "number" && quantity > 0) {
          const category = product.category?.toLowerCase();
          let updateField = null;

          if (["comics", "clothes", "shoes"].includes(category) && variant)
            updateField = `stock.${variant}`;
          else if (category === "toys") 
            updateField = "stock";

          if (updateField) 
            await productModel.updateOne(
              { _id: product._id },
              { $inc: { [updateField]: quantity } },
              { session: mongoSession },
            );
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

// Note: This function is now called via API endpoint by Vercel Cron Jobs
// The cron scheduling has been moved to vercel.json configuration

module.exports = cleanupExpiredReservations;
