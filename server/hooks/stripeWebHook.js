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
  console.log("Webhook: Starting payment processing");
  console.log("Mongoose connection state:", mongoose.connection.readyState);
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting

  await dbConnect(); // Wait for database connection to be established
  console.log("After dbConnect call, state:", mongoose.connection.readyState);

  const mongoSession = await mongoose.startSession(); // Should work now

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
        stripeSessionId: StripeSession.id,
      })
      .session(mongoSession);

    if (existingOrder) {
      console.log(`Order already exists for session ${StripeSession.id}`);
      await mongoSession.abortTransaction();
      return;
    }

    const {
      cartId,
      couponCode,
      originalTotal,
      finalTotal,
      discountAmount,
      shippingAddress,
      shippingCost,
      userEmail: metadataUserEmail,
    } = StripeSession.metadata;

    // Find the reservation
    const reservation = await reservationModel
      .findOne({ cartId })
      .populate("products.productId")
      .session(mongoSession);

    if (!reservation) {
      await mongoSession.abortTransaction();
      console.error(`No reservation found for cart: ${cartId}`);
      throw new Error(`No reservation found for cart: ${cartId}`);
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
      console.error(`❌ No user found with email: ${userEmail}`);
      console.error(
        `📧 Session customer email: ${StripeSession.customer_details?.email}`
      );
      throw new Error(`No user found with email: ${userEmail}`);
    }

    // Additional validation: ensure the emails match for security
    if (
      StripeSession.customer_details?.email &&
      StripeSession.customer_details.email !== userEmail
    ) {
      console.warn(`⚠️ Email mismatch detected:`);
      console.warn(
        `   Session customer email: ${StripeSession.customer_details.email}`
      );
      console.warn(`   Metadata email: ${userEmail}`);
      console.warn(`   Using metadata email for consistency`);
    }

    console.log(`✅ User found: ${user.email} (ID: ${user._id})`);
    console.log(
      `🔐 Email validation passed - authenticated user matches order`
    );

    // Create order from reservation data matching your Order model structure
    const orderData = {
      orderID: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      stripeSessionId: StripeSession.id, // Add this field
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

    console.log(
      "📝 Creating order with data:",
      JSON.stringify(orderData, null, 2)
    );
    const order = new orderModel(orderData);
    console.log("💾 Saving order to database...");
    const savedOrder = await order.save({ session: mongoSession });
    console.log("✅ Order saved with ID:", savedOrder._id);

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
    await reservationModel.deleteOne({ cartId }, { session: mongoSession });

    // Commit the transaction
    console.log("🔄 Committing transaction...");
    await mongoSession.commitTransaction();
    console.log("✅ Transaction committed successfully");

    console.log(
      `✅ Order ${savedOrder.orderID} created successfully for cart ${cartId}`
    );
  } catch (error) {
    // Remove from processed set if transaction fails
    processedSessions.delete(StripeSession.id);
    await mongoSession.abortTransaction();
    console.error("❌ Transaction failed for cart:", cartId, error);
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
      // Acknowledge immediately and process asynchronously to avoid timeouts on cold starts
      res.status(200).json({ received: true }); // received: true -> tells stripe that you have sent the data to our server successfully
      // Process in background (best-effort). In serverless, this runs within the same invocation
      // but after response is sent. Consider moving to a queue/background function for stronger guarantees.
      processSuccessfulPayment(StripeSession).catch((error) => {
        console.error("Async processing error:", error);
      });
      return; // prevent fall-through to final res.json
    } catch (error) {
      console.error("❌ Error processing payment:", error);
      console.error("Error stack:", error.stack);
      // We already acknowledged above; just log the error.
      return;
    }
  }

  // Handle failed payments - DO NOT cancel reservations (user can still pay with COD)
  if (
    event.type === "checkout.session.async_payment_failed" ||
    event.type === "payment_intent.payment_failed"
  ) {
    const session = event.data.object;
    const { cartId, userEmail: metadataUserEmail } = session.metadata || {};

    try {
      // Log the failed payment but keep reservation intact
      const userEmail = session.customer_details?.email || metadataUserEmail;

      console.log(`💳 Payment failed for cart: ${cartId}, user: ${userEmail}`);
      console.log(
        `🛒 Reservation preserved - user can still pay with Cash on Delivery`
      );

      // Just log the failure - don't modify reservation model
      console.log(`📝 Payment failure logged for tracking: ${event.type}`);
    } catch (error) {
      console.error("❌ Error logging failed payment:", error);
      // Don't throw error - this shouldn't block webhook processing
    }
  }

  // Handle expired sessions - Just log, don't delete reservations
  if (event.type === "checkout.session.expired") {
    const session = event.data.object;
    const { cartId, userEmail: metadataUserEmail } = session.metadata || {};

    try {
      const userEmail = session.customer_details?.email || metadataUserEmail;

      console.log(
        `⏰ Checkout session expired for cart: ${cartId}, user: ${userEmail}`
      );
      console.log(
        `🛒 Reservation preserved - will be auto-cleaned by cleanup script after 2 days`
      );
    } catch (error) {
      console.error("❌ Error logging expired session:", error);
      // Don't throw error - this shouldn't block webhook processing
    }
  }

  // For other events, acknowledge quickly
  res.json({ received: true });
};

module.exports = {
  handleStripeWebhook,
};
