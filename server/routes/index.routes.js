const express = require("express");
const router = express.Router();

const authRoutes = require("./modules/auth.route.js");
const googleAuthRoutes = require("./modules/googleAuth.route.js");
const productRoutes = require("./modules/product.route.js");
const couponRoutes = require("./modules/coupon.route.js");
const orderRoutes = require("./modules/order.route.js");
const userRoutes = require("./modules/user.route.js");
const exportRoutes = require("./modules/export.route.js");
const reservationRoutes = require("./modules/reservation.route.js");
const stripeRoutes = require("./modules/stripe.routes.js");
const cartRoutes = require("./modules/cart.route.js");

// Mount all routers
router.use("/auth", authRoutes);
router.use("/googleAuth", googleAuthRoutes);
router.use("/product", productRoutes);
router.use("/coupon", couponRoutes);
router.use("/order", orderRoutes);
router.use("/user", userRoutes);
router.use("/export", exportRoutes);
router.use("/", reservationRoutes);
router.use("/stripe", stripeRoutes);
router.use("/cart", cartRoutes);

module.exports = router;
