const Stripe = require("stripe");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const reservationModel = require("../models/reservation.model.js");
const orderModel = require("../models/order.model.js");
const userModel = require("../models/user.model.js");
const couponModel = require("../models/coupon.model.js");
const dbConnect = require("../config/dbConnect.js");
dotenv.config();

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const webHookSecretKey = process.env.STRIPE_WEBHOOK_SECRET;
const processedSessions = new Set(); // In-memory store for processed sessions

const processSuccessfulPayment = async (StripeSession) => {
  await dbConnect(); // Wait for database connection to be established

  const mongoSession = await mongoose.startSession();

  // Prevent double processing
  if (processedSessions.has(StripeSession.id)) {
    console.log(`Session ${StripeSession.id} already processed, skipping`);
    return;
  }

  try {
    mongoSession.startTransaction();

    // Mark session as being processed
    processedSessions.add(StripeSession.id);

    // Check if order already exists for this session
    const existingOrder = await orderModel
      .findOne({
        stripeSessionID: StripeSession.id,
      })
      .session(mongoSession);

    if (existingOrder) {
      console.log(`Order already exists for session ${StripeSession.id}`);
      await mongoSession.abortTransaction();
      return;
    }

    const {
      userId,
      couponCode,
      originalTotal,
      finalTotal,
      discountAmount,
      shippingAddress,
      shippingCost,
      userEmail: metadataUserEmail,
    } = StripeSession.metadata;

    // Find the reservation by userId from verified token
    const reservation = await reservationModel
      .findOne({ userId })
      .populate("products.productId")
      .session(mongoSession);

    if (!reservation) {
      await mongoSession.abortTransaction();
      console.error(`No reservation found for user: ${userId}`);
      throw new Error(`No reservation found for user: ${userId}`);
    }

    // Extract user email for user identification
    const userEmail =
      StripeSession.customer_details?.email || metadataUserEmail;

    // Find the user to get their ID (required for Order model)
    const user = await userModel
      .findOne({ email: userEmail })
      .session(mongoSession);
    if (!user) {
      await mongoSession.abortTransaction();
      console.error(`No user found with email: ${userEmail}`);
      console.error(
        `Session customer email: ${StripeSession.customer_details?.email}`
      );
      throw new Error(`No user found with email: ${userEmail}`);
    }

    // Additional validation: ensure the emails match for security
    if (
      StripeSession.customer_details?.email &&
      StripeSession.customer_details.email !== userEmail
    ) {
      console.warn(`Email mismatch detected:`);
      console.warn(
        `   Session customer email: ${StripeSession.customer_details.email}`
      );
      console.warn(`   Metadata email: ${userEmail}`);
      console.warn(`   Using metadata email for consistency`);
    }

    // Create order from reservation data matching your Order model structure
    const orderData = {
      orderID: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      stripeSessionID: StripeSession.id, // Add this field
      products: reservation.products.map((item) => ({
        productId: item.productId._id,
        quantity: item.quantity,
        price: item.productId.price,
      })),
      user: user._id, // Required field in your Order model
      shippingAddress,
      paymentMethod: "stripe",
      subtotal: parseFloat(originalTotal),
      shippingCost: parseFloat(shippingCost) || 5,
      discount: parseFloat(discountAmount) || 0,
      finalAmount: parseFloat(finalTotal),
      couponCode: couponCode || null,
      status: "processing", // Using your enum values
      orderDate: new Date(),
    };

    const order = new orderModel(orderData);

    const savedOrder = await order.save({ session: mongoSession });

    // Handle coupon usage if coupon was used
    if (couponCode) {
      const coupon = await couponModel
        .findOne({ couponCode })
        .session(mongoSession);
      if (coupon) {
        // Update coupon statistics
        await couponModel.findByIdAndUpdate(
          coupon._id,
          {
            $inc: {
              totalUsage: 1,
              lifeTimeDiscount: discountAmount,
            },
          },
          { session: mongoSession }
        );

        // Add coupon to user's used coupons array (prevent reuse)
        if (!user.couponCodeUsed.includes(coupon._id)) {
          await userModel.findByIdAndUpdate(
            user._id,
            {
              $push: {
                couponCodeUsed: coupon._id,
                orders: savedOrder._id,
              },
            },
            { session: mongoSession }
          );
        } else {
          // Just add the order if coupon already used
          await userModel.findByIdAndUpdate(
            user._id,
            {
              $push: { orders: savedOrder._id },
            },
            { session: mongoSession }
          );
        }
      }
    } else {
      // No coupon used, just add order to user
      await userModel.findByIdAndUpdate(
        user._id,
        {
          $push: { orders: savedOrder._id },
        },
        { session: mongoSession }
      );
    }

    // Delete reservation after successful order creation
    await reservationModel.deleteOne({ userId }, { session: mongoSession });

    // Commit the transaction

    await mongoSession.commitTransaction();
  } catch (error) {
    // Remove from processed set if transaction fails
    processedSessions.delete(StripeSession.id);
    await mongoSession.abortTransaction();
    console.error("Transaction failed for user:", userId, error);
    throw error;
  } finally {
    mongoSession.endSession();
  }
};

const handleStripeWebhook = async (req, res) => {
  // Do NOT connect to DB yet; first verify signature to avoid expensive work on invalid calls
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    // Verify webhook signature for security
    event = stripe.webhooks.constructEvent(req.body, sig, webHookSecretKey);
  } catch (err) {
    console.error(`Webhook signature verification failed:`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle successful payment completion
  if (event.type === "checkout.session.completed") {
    const StripeSession = event.data.object;

    try {

      // Now process payment
      await processSuccessfulPayment(StripeSession);

      // Only send 200 after everything succeeds
      res.status(200).json({ received: true }); // tells stripe that the data sent by your server via webhook has been processed
      return;
    } catch (error) {
      console.error("Error processing payment:", error);
      console.error("Error stack:", error.stack);

      // Send 500 so Stripe retries
      res.status(500).json({ error: error.message });
      return;
    }
  }

  // Handle failed payments - DO NOT cancel reservations (user can still pay with COD)
  if (
    event.type === "checkout.session.async_payment_failed" ||
    event.type === "payment_intent.payment_failed"
  ) {
    const session = event.data.object;
    const { userId, userEmail: metadataUserEmail } = session.metadata || {};

    try {
      // Log the failed payment but keep reservation intact
      const userEmail = session.customer_details?.email || metadataUserEmail;

      console.log(`Payment failed for user: ${userId}, email: ${userEmail}`);
     
      // Just log the failure - don't modify reservation model
      console.log(`Payment failure logged for tracking: ${event.type}`);
    } catch (error) {
      console.error("Error logging failed payment:", error);
      // Don't throw error - this shouldn't block webhook processing
    }
  }

  // Handle expired sessions - Just log, don't delete reservations
  if (event.type === "checkout.session.expired") {
    const session = event.data.object;
    const { userId, userEmail: metadataUserEmail } = session.metadata || {};

    try {
      const userEmail = session.customer_details?.email || metadataUserEmail;

      console.log(
        `Checkout session expired for user: ${userId}, email: ${userEmail}`
      );
      console.log(
        `Reservation preserved - will be auto-cleaned by cleanup script after 2 days`
      );
    } catch (error) {
      console.error("Error logging expired session:", error);
      // Don't throw error - this shouldn't block webhook processing
    }
  }

  // Tells Stripe that data has been received
  res.json({ received: true });
};

module.exports = {
  handleStripeWebhook,
};
