const Stripe = require("stripe");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const reservationModel = require("../db/models/reservation.model.js");
const orderModel = require("../db/models/order.model.js");
const userModel = require("../db/models/user.model.js");
const couponModel = require("../db/models/coupon.model.js");
const productModel = require("../db/models/product.model.js");
const checkoutSessionModel = require("../db/models/checkoutSession.model.js");
const dbConnect = require("../db/dbConnect.js");
dotenv.config();

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const webHookSecretKey = process.env.STRIPE_WEBHOOK_SECRET;

// Removes the purchased quantities from the user's cart reservation.
// Stock for reserved items was already decremented when they were reserved, so normally
// this only shrinks the reservation. If the user removed items from the cart after starting
// checkout (which released that stock), the shortfall is taken from product stock instead.
const consumeReservation = async (userId, paidProducts, mongoSession) => {
  const reservation = await reservationModel
    .findOne({ userId })
    .session(mongoSession);

  for (const item of paidProducts) {
    const entry = reservation?.products.find(
      (p) => String(p.productId) === String(item.productId) && p.variant === item.variant,
    );
    const takenFromReservation = entry ? Math.min(entry.quantity, item.quantity) : 0;
    if (entry)
      entry.quantity -= takenFromReservation;

    const shortfall = item.quantity - takenFromReservation;
    if (shortfall > 0) {
      // $elemMatch makes the label and stock conditions apply to the SAME variant
      const result = await productModel.updateOne(
        {
          _id: item.productId,
          variants: { $elemMatch: { label: item.variant, stock: { $gte: shortfall } } },
        },
        { $inc: { "variants.$.stock": -shortfall } },
        { session: mongoSession },
      );
      if (result.modifiedCount === 0)
        // The customer already paid, so the order is still recorded; flag it for manual follow-up
        console.warn(
          `Oversold: product ${item.productId} (${item.variant}) is short by ${shortfall} for paid order of user ${userId}`,
        );
    }
  }

  if (!reservation)
    return;

  reservation.products = reservation.products.filter((p) => p.quantity > 0);
  if (reservation.products.length === 0)
    await reservationModel.deleteOne({ _id: reservation._id }, { session: mongoSession });
  else
    await reservation.save({ session: mongoSession });
};

const processSuccessfulPayment = async (StripeSession) => {
  // Async payment methods report "unpaid" here and succeed later via async_payment_succeeded
  if (StripeSession.payment_status !== "paid") {
    console.log(`Session ${StripeSession.id} completed but not paid yet (${StripeSession.payment_status}), skipping`);
    return;
  }

  let mongoSession = null;

  try {
    await dbConnect(); // Wait for database connection to be established
    mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();

    // Duplicate deliveries are stopped here and by the unique index on orders.stripeSessionID
    const existingOrder = await orderModel
      .findOne({ stripeSessionID: StripeSession.id })
      .session(mongoSession);

    if (existingOrder) {
      console.log(`Order already exists for session ${StripeSession.id}`);
      await mongoSession.abortTransaction();
      return;
    }

    // The order is built ONLY from what was stored when this session was created
    const snapshot = await checkoutSessionModel
      .findOne({ stripeSessionID: StripeSession.id })
      .session(mongoSession);

    if (!snapshot)
      throw new Error(`No checkout snapshot found for session ${StripeSession.id}`);

    // The session must belong to the user the snapshot was created for
    const metadataUserId = StripeSession.metadata?.userId;
    if (metadataUserId && String(snapshot.userId) !== String(metadataUserId))
      throw new Error(`User mismatch for session ${StripeSession.id}`);

    // What Stripe charged must exactly match what the snapshot says was being paid for
    if (
      StripeSession.amount_total !== snapshot.amountTotalCents ||
      String(StripeSession.currency || "").toLowerCase() !== snapshot.currency
    )
      throw new Error(
        `Amount mismatch for session ${StripeSession.id}: charged ${StripeSession.amount_total} ${StripeSession.currency}, expected ${snapshot.amountTotalCents} ${snapshot.currency}`,
      );

    // Identify the user by ID (not by the email typed into Stripe Checkout)
    const user = await userModel.findById(snapshot.userId).session(mongoSession);
    if (!user)
      throw new Error(`No user found with id: ${snapshot.userId}`);

    const orderData = {
      orderID: `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      stripeSessionID: StripeSession.id,
      products: snapshot.products.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      })),
      user: user._id,
      shippingAddress: snapshot.shippingAddress,
      paymentMethod: "stripe",
      subtotal: snapshot.subtotal,
      shippingCost: snapshot.shippingCost,
      discount: snapshot.discount,
      finalAmount: StripeSession.amount_total / 100, // the amount actually charged
      couponCode: snapshot.couponCode || null,
      status: "processing",
      orderDate: new Date(),
    };

    const [savedOrder] = await orderModel.create([orderData], { session: mongoSession });

    // Record coupon usage (validated when the session was created)
    if (snapshot.couponId) {
      await couponModel.findByIdAndUpdate(
        snapshot.couponId,
        { $inc: { totalUsage: 1, lifeTimeDiscount: snapshot.discount } },
        { session: mongoSession },
      );
      if ((user.couponCodeUsed || []).some((id) => String(id) === String(snapshot.couponId)))
        console.warn(`Coupon ${snapshot.couponCode} was already used by user ${user._id} (session ${StripeSession.id})`);
    }

    await userModel.findByIdAndUpdate(
      user._id,
      {
        $push: { orders: savedOrder._id },
        ...(snapshot.couponId && { $addToSet: { couponCodeUsed: snapshot.couponId } }),
      },
      { session: mongoSession },
    );

    // Remove only the paid items from the cart; anything added after checkout stays in the cart
    await consumeReservation(user._id, snapshot.products, mongoSession);

    snapshot.status = "completed";
    await snapshot.save({ session: mongoSession });

    await mongoSession.commitTransaction();
  } catch (error) {
    if (mongoSession && (typeof mongoSession.inTransaction === "function" ? mongoSession.inTransaction() : true)) {
      try {
        await mongoSession.abortTransaction();
      } catch (abortErr) {
        console.error("Error aborting transaction:", abortErr);
      }
    }
    console.error("Transaction failed for session:", StripeSession.id, error);
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
};

const handleStripeWebhook = async (req, res) => {
  // Do NOT connect to DB yet; first verify signature to avoid expensive work on invalid calls
  const sig = req.headers?.["stripe-signature"];
  let event;

  try {
    // Verify webhook signature for security
    event = stripe.webhooks.constructEvent(req.body, sig, webHookSecretKey);
  } catch (err) {
    console.error(`Webhook signature verification failed:`, err.message);
    return res.status(400).send("Webhook signature verification failed");
  }

  // Handle successful payment completion (cards complete immediately; async methods succeed later)
  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    try {
      await processSuccessfulPayment(event.data.object);
      // Only send 200 after everything succeeds
      return res.status(200).json({ received: true });
    } catch (error) {
      console.error("Error processing payment:", error);
      // Send 500 so Stripe retries (no internal details in the response)
      return res.status(500).json({ error: "Payment processing failed" });
    }
  }

  // Handle failed payments - DO NOT cancel reservations (user can still pay with COD)
  if (
    event.type === "checkout.session.async_payment_failed" ||
    event.type === "payment_intent.payment_failed"
  ) {
    const session = event.data.object;
    console.log(`Payment failed for user: ${session.metadata?.userId} (${event.type})`);
  }

  // Expired sessions: mark the snapshot expired, keep the reservation (auto-cleaned after 2 days)
  if (event.type === "checkout.session.expired") {
    const session = event.data.object;
    try {
      await dbConnect();
      await checkoutSessionModel.updateOne(
        { stripeSessionID: session.id, status: "pending" },
        { status: "expired" },
      );
    } catch (error) {
      // Don't fail the webhook - this is bookkeeping only
      console.error("Error marking checkout session expired:", error);
    }
  }

  // Tells Stripe that data has been received
  res.json({ received: true });
};

module.exports = {
  handleStripeWebhook,
  processSuccessfulPayment,
};
