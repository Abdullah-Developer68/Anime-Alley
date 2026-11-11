const dotenv = require("dotenv");
const reservationModel = require("../db/models/reservation.model.js");
const userModel = require("../db/models/user.model.js");
const checkoutSessionModel = require("../db/models/checkoutSession.model.js");
const dbConnect = require("../db/dbConnect.js");
const { resolveTrustedClientOrigin } = require("../utils/origin.utils.js");
const { validateCouponForUser } = require("../utils/coupon.utils.js");
const { formatPrice } = require("../utils/formatPrice.utils.js");
const { addressProblem } = require("../utils/validation.utils.js");
const { getStripe } = require("../config/stripe/stripe.config.js");
dotenv.config();

const SHIPPING_COST = 5;
const CURRENCY = "usd";

// Expire the user's other open checkout sessions so only the newest one can be paid.
// This stops an old session (with an old cart or an already-used coupon) from being paid later.
// If Stripe refuses (the session already completed or expired), the webhook reconciles its status.
const expireOpenSessions = async (userId) => {
  const openSessions = await checkoutSessionModel
    .find({ userId, status: "pending" })
    .select("stripeSessionID");

  for (const open of openSessions) {
    try {
      await getStripe().checkout.sessions.expire(open.stripeSessionID);
      await checkoutSessionModel.updateOne(
        { _id: open._id, status: "pending" },
        { status: "expired" },
      );
    } catch (err) {
      console.warn(`Could not expire checkout session ${open.stripeSessionID}: ${err.message}`);
    }
  }
};

const createCheckoutSession = async (req, res) => {
  try {
    const paymentData = req.body?.paymentData;
    if (!paymentData)
      return res.status(400).json({ error: "Payment data is required" });

    const { couponCode, deliveryAddress } = paymentData || {};
    const invalidAddress = addressProblem(deliveryAddress);
    if (invalidAddress)
      return res.status(400).json({ error: invalidAddress });

    if (couponCode != null && typeof couponCode !== "string")
      return res.status(400).json({ error: "Coupon code must be a string" });

    const trimmedCouponCode = typeof couponCode === "string" ? couponCode.trim() : "";

    // Extract user info from verified JWT token (set by verifyTokenMiddleware)
    const userId = req.user?.id;
    const authenticatedUserEmail = req.user?.email;
    if (!userId)
      return res.status(401).json({ error: "Invalid user session" });

    await dbConnect();

    const [user, reservation] = await Promise.all([
      userModel.findById(userId).select("couponCodeUsed").lean(),
      reservationModel.findOne({ userId }).populate({ path: "products.productId", select: "name price image" }).lean(),
    ]);
    if (!user)
      return res.status(404).json({ error: "User not found" });

    if (!reservation || !reservation.products || reservation.products.length === 0)
      return res.status(404).json({ error: "No reservations found for this cart" });

    // Every reserved product must still exist, otherwise the charge would not match the cart
    if (reservation.products.some((item) => !item.productId))
      return res.status(409).json({
        error: "Some products in your cart are no longer available. Please review your cart.",
      });

    // Snapshot of exactly what is being paid for, using current DB prices
    const snapshotProducts = reservation.products.map((item) => ({
      productId: item.productId._id,
      variant: item.variant,
      quantity: item.quantity,
      price: formatPrice(item.productId.price),
      name: item.productId.name,
      image: item.productId.image,
    }));

    const subtotal = formatPrice(
      snapshotProducts.reduce((sum, item) => sum + item.price * item.quantity, 0),
    );
    if (subtotal <= 0)
      return res.status(400).json({ error: "Cart total must be greater than zero" });

    // Coupon: same rules as every other payment path (exists, not expired, not used by this user)
    let coupon = null;
    if (trimmedCouponCode.length > 0) {
      const couponCheck = await validateCouponForUser(trimmedCouponCode, user);
      if (!couponCheck.valid)
        // do not proceed with the payment if the coupon cannot be applied
        return res.status(couponCheck.status).json({ error: couponCheck.message });
      coupon = couponCheck.coupon;
    }

    const discountAmount = coupon
      ? formatPrice(subtotal * (coupon.discountPercentage / 100))
      : 0;
    const finalTotal = formatPrice(subtotal + SHIPPING_COST - discountAmount);

    // Spread shipping and discount proportionally across the line items
    // (prices are pre-discounted, so no Stripe discounts are added)
    const discountRatio = finalTotal / subtotal;
    const lineItems = snapshotProducts.map((item) => ({
      price_data: {
        currency: CURRENCY,
        product_data: {
          name: item.name,
          images: item.image ? [`${item.image}`] : [],
        },
        unit_amount: Math.round(item.price * discountRatio * 100),
      },
      quantity: item.quantity,
    }));

    // The exact amount Stripe will charge; the webhook checks the paid amount against it
    const amountTotalCents = lineItems.reduce(
      (sum, item) => sum + item.price_data.unit_amount * item.quantity,
      0,
    );

    // Only the newest session for this user may be paid
    await expireOpenSessions(userId);

    // Resolve trusted client base URL to return user to their originating deployment domain
    const clientBaseUrl = resolveTrustedClientOrigin(req);

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: lineItems,
      // The {CHECKOUT_SESSION_ID} is a Stripe placeholder that gets replaced with the actual session ID.
      success_url: `${clientBaseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientBaseUrl}/cart`,

      // Lock the customer email to the authenticated user's email
      customer_creation: "always",
      customer_email: authenticatedUserEmail,

      // Informational only - the webhook builds the order from the stored snapshot
      metadata: {
        userId: userId.toString(),
        couponCode: coupon ? coupon.couponCode : "",
      },
    });

    // Persist the snapshot. If this fails, kill the session so it can never be paid without one.
    try {
      await checkoutSessionModel.create({
        stripeSessionID: session.id,
        userId,
        products: snapshotProducts,
        couponId: coupon ? coupon._id : null,
        couponCode: coupon ? coupon.couponCode : null,
        subtotal,
        discount: discountAmount,
        shippingCost: SHIPPING_COST,
        amountTotalCents,
        currency: CURRENCY,
        shippingAddress: deliveryAddress.trim(),
      });
    } catch (snapshotErr) {
      await getStripe().checkout.sessions.expire(session.id).catch(() => {});
      throw snapshotErr;
    }

    res.status(201).json({
      sessionId: session.id,
      // The client navigates here; it no longer needs Stripe.js just to redirect
      url: session.url,
      subtotal: subtotal.toFixed(2),
      discountAmount: discountAmount || "0",
      finalTotal: (amountTotalCents / 100).toFixed(2),
      couponApplied: coupon ? coupon.couponCode : null,
    });
  } catch (err) {
    console.error("Stripe session creation error:", err);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
};

module.exports = {
  createCheckoutSession,
  expireOpenSessions,
};
