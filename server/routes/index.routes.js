const express = require("express");
const router = express.Router();

const authRoutes = require("./modules/auth.route.js");
const googleAuthRoutes = require("./modules/googleAuth.route.js");
const productRoutes = require("./modules/product.route.js");
const couponRoutes = require("./modules/coupon.route.js");
const orderRoutes = require("./modules/order.route.js");
const userRoutes = require("./modules/user.route.js");
const exportRoutes = require("./modules/export.route.js");
const checkoutRoutes = require("./modules/checkout.route.js");
const cartRoutes = require("./modules/cart.route.js");
const cleanupRoutes = require("./modules/cleanup.route.js");

// Every router is mounted on its own resource path so its middleware never runs for other routes
router.use("/auth", authRoutes);
router.use("/googleAuth", googleAuthRoutes);
router.use("/products", productRoutes);
router.use("/coupons", couponRoutes);
router.use("/orders", orderRoutes);
router.use("/users", userRoutes);
router.use("/exports", exportRoutes);
router.use("/checkout-sessions", checkoutRoutes);
router.use("/cart", cartRoutes);
router.use("/cleanup", cleanupRoutes);

module.exports = router;
