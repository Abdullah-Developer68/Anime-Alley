const Stripe = require("stripe");
const dotenv = require("dotenv");
const reservationModel = require("../models/reservation.model.js");
const dbConnect = require("../config/dbConnect.js");
const couponModel = require("../models/coupon.model.js");
dotenv.config();

// Initialized Stripe instance for backends
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const createCheckoutSession = async (req, res) => {
  await dbConnect();

  // Extract user info from verified JWT token (set by verifyTokenMiddleware)
  const userId = req.user.id;
  const authenticatedUserEmail = req.user.email;


  const { paymentData } = req.body;
  const { couponCode, deliveryAddress } = paymentData;
  const shippingCost = 5;

  try {
    // Find reservation by userId from verified token
    const reservation = await reservationModel
      .findOne({ userId })
      .populate("products.productId");

    if (
      !reservation ||
      !reservation.products ||
      reservation.products.length === 0
    ) {
      return res
        .status(404)
        .json({ error: "No reservations found for this cart" });
    }

    // Create line items using the FINAL discounted prices

    // Calculate per-item discount ratio
    const calculatedSubtotal = reservation.products.reduce(
      (sum, currItem) => sum + currItem.productId.price * currItem.quantity,
      0
    );
    let coupon;
    let discountAmount;
    if (couponCode.length > 0) {
      // find the coupon used
      coupon = await couponModel.findOne({ couponCode });

      if (!coupon) {
        // do not proceed further because we do not want to procced with the payment if coupon was not applied
        return res.status(400).json({ error: "Coupon not found" });
      }
      // calculate the discount
      discountAmount = Math.round(
        calculatedSubtotal * (coupon.discountPercentage / 100)
      );
    } else {
      discountAmount = 0;
    }

    // calculate final Total
    const finalTotal = calculatedSubtotal + shippingCost - discountAmount;
    // calculate the discount ratio
    const discountRatio = finalTotal / calculatedSubtotal;
    // calculate the discounted price for each item
    const lineItems = reservation.products.map((item) => {
      const itemOriginalPrice = item.productId.price;
      const itemDiscountedPrice = itemOriginalPrice * discountRatio;

      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: item.productId.name,
            images: [`${item.productId.image}`],
          },
          unit_amount: Math.round(itemDiscountedPrice * 100), // Use discounted price
        },
        quantity: item.quantity,
      };
    });

    // Get coupon info for display (if provided)
    let appliedCoupon = null;
    if (couponCode && authenticatedUserEmail) {
      appliedCoupon = await couponModel.findOne({ couponCode });
    }

    // Create checkout session configuration with locked email
    const sessionConfig = {
      payment_method_types: ["card"],
      mode: "payment",
      line_items: lineItems,
      //The {CHECKOUT_SESSION_ID} is a Stripe placeholder that gets replaced with the actual session ID.
      success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cart`,

      // Lock the customer email to the authenticated user's email
      customer_creation: "always",
      customer_email: authenticatedUserEmail,

      metadata: {
        userId: userId.toString(), // Use userId from verified token
        couponCode: couponCode || "",
        userEmail: authenticatedUserEmail, // Use authenticated email
        discountAmount: discountAmount || "0",
        originalTotal: calculatedSubtotal.toFixed(2),
        finalTotal: finalTotal.toFixed(2),
        shippingAddress: deliveryAddress || "",
        shippingCost: shippingCost || 5,
      },
    };

    // DO NOT add Stripe discounts - prices are already discounted
    // The discount was applied in cart.jsx before reaching this point

    // Create a new Stripe Checkout Session
    const session = await stripe.checkout.sessions.create(sessionConfig);

    res.json({
      sessionId: session.id,
      subtotal: calculatedSubtotal.toFixed(2),
      discountAmount: discountAmount || "0",
      finalTotal: finalTotal || calculatedSubtotal.toFixed(2),
      couponApplied: appliedCoupon ? appliedCoupon.couponCode : null,
    });
  } catch (err) {
    console.error("Stripe session creation error:", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createCheckoutSession,
};
