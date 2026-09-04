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

    if (expiredReservations?.length > 0) {
      // Collect deduplicated referenced product IDs and expired reservation IDs
      const productIdsSet = new Set();
      const expiredReservationIds = [];

      for (const reservation of expiredReservations) {
        if (reservation?._id)
          expiredReservationIds.push(reservation._id);
        const products = reservation?.products || [];
        for (const reservedProduct of products) {
          const productId = reservedProduct?.productId?._id || reservedProduct?.productId;
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

        // Aggregate stock increments in memory per product
        const stockUpdates = new Map();

        for (const reservation of expiredReservations) {
          const productsList = reservation?.products || [];
          for (const reservedProduct of productsList) {
            const rawProductId = reservedProduct?.productId?._id || reservedProduct?.productId;
            const { variant, quantity } = reservedProduct || {};
            if (!rawProductId || typeof quantity !== "number" || quantity <= 0)
              continue;

            const product = productMap.get(String(rawProductId));
            if (!product)
              continue;

            const category = product?.category?.toLowerCase();
            let updateField = null;

            if (["comics", "clothes", "shoes"].includes(category) && variant)
              updateField = `stock.${variant}`;
            else if (category === "toys")
              updateField = "stock";

            if (updateField) {
              const prodIdStr = String(product._id);
              if (!stockUpdates.has(prodIdStr))
                stockUpdates.set(prodIdStr, { id: product._id, inc: {} });

              const target = stockUpdates.get(prodIdStr);
              target.inc[updateField] = (target.inc[updateField] || 0) + quantity;
            }
          }
        }

        // Apply batched increments using bulkWrite
        if (stockUpdates.size > 0) {
          const bulkOps = [];
          for (const { id, inc } of stockUpdates.values()) {
            bulkOps.push({
              updateOne: {
                filter: { _id: id },
                update: { $inc: inc },
              },
            });
          }

          if (bulkOps.length > 0)
            await productModel.bulkWrite(bulkOps, { session: mongoSession });
        }
      }

      if (expiredReservationIds.length > 0)
        await reservationModel.deleteMany(
          { _id: { $in: expiredReservationIds } },
          { session: mongoSession },
        );
    }

    await mongoSession.commitTransaction();
  } catch (error) {
    if (mongoSession && (typeof mongoSession.inTransaction === "function" ? mongoSession.inTransaction() : true)) {
      try {
        await mongoSession.abortTransaction();
      } catch (abortErr) {
        console.error("Error aborting transaction:", abortErr);
      }
    }
    console.error("[CLEANUP] Error cleaning up expired reservations:", error);
    throw error;
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

// Note: This function is now called via API endpoint by Vercel Cron Jobs
// The cron scheduling has been moved to vercel.json configuration

module.exports = cleanupExpiredReservations;
