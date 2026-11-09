const reservationModel = require("../db/models/reservation.model.js");
const productModel = require("../db/models/product.model.js");
const mongoose = require("mongoose");

// Runs inside a transaction and may run more than once (see below), so it must only read and write through mongoSession
async function restoreAndDeleteExpiredReservations(mongoSession) {
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

      // Aggregate variant stock increments in memory per product and variant
      const variantStockUpdates = new Map();

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

    if (expiredReservationIds.length > 0)
      await reservationModel.deleteMany(
        { _id: { $in: expiredReservationIds } },
        { session: mongoSession },
      );
  }
}

async function cleanupExpiredReservations() {
  const mongoSession = await mongoose.startSession();

  try {
    // withTransaction commits, or aborts and re-runs the callback when MongoDB marks the error as
    // transient (for example a write conflict with a customer reserving the same product)
    await mongoSession.withTransaction(() => restoreAndDeleteExpiredReservations(mongoSession));
  } catch (error) {
    console.error("[CLEANUP] Error cleaning up expired reservations:", error);
    throw error;
  } finally {
    await mongoSession.endSession().catch((endErr) => console.error("Error ending session:", endErr));
  }
}

// Called by Vercel Cron Jobs through GET /api/cleanup/reservations (schedule in vercel.json)
module.exports = cleanupExpiredReservations;
