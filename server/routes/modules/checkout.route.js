const express = require("express");
const router = express.Router();
const {
  verifyTokenMiddleware,
} = require("../../middlewares/custom/auth.middleware.js");
const { createCheckoutSession } = require("../../services/stripe.js");
const { verifyOrder } = require("../../controllers/order.controller.js");
const {
  orderLookupLimiter,
  checkoutLimiter,
} = require("../../middlewares/custom/rateLimiters.middleware.js");

// Public: the success page checks whether the webhook has created the order yet.
// Stripe session IDs are high-entropy, so knowing one is the access check.
router.get("/:sessionId/order", orderLookupLimiter, verifyOrder);

// The Stripe webhook stays at POST /api/stripe/webhook (see app.js); that URL is registered with Stripe
router.post("/", verifyTokenMiddleware, checkoutLimiter, createCheckoutSession);

module.exports = router;
