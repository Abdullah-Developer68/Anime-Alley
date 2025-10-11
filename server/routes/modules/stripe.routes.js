const express = require("express");
const router = express.Router();
const verifyTokenMiddleware = require("../../middlewares/custom/auth.middleware.js");
const stripeService = require("../../services/stripe.js");

// All stripe routes require authentication
router.use(verifyTokenMiddleware);

router.post("/create-checkout-session", stripeService.createCheckoutSession);

module.exports = router;
