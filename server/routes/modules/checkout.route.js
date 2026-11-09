const express = require("express");
const router = express.Router();
const {
  verifyTokenMiddleware,
} = require("../../middlewares/custom/auth.middleware.js");
const { createCheckoutSession } = require("../../services/stripe.js");
const { verifyOrder } = require("../../controllers/order.controller.js");

// Public: the success page checks whether the webhook has created the order yet.
// Stripe session IDs are high-entropy, so knowing one is the access check.
router.get("/:sessionId/order", verifyOrder);

// The Stripe webhook stays at POST /api/stripe/webhook (see app.js); that URL is registered with Stripe
router.post("/", verifyTokenMiddleware, createCheckoutSession);

module.exports = router;
