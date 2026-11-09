const express = require("express");
const router = express.Router();
const {
  verifyTokenMiddleware,
  requireAdmin,
} = require("../../middlewares/custom/auth.middleware.js");
const {
  placeOrder,
  getOrderHistory,
  allOrdersList,
  deleteOrder,
  updateOrder,
  getOrderStats,
} = require("../../controllers/order.controller.js");

// All order routes require authentication
router.use(verifyTokenMiddleware);

// Logged-in user's own orders
router.post("/", placeOrder);
router.get("/me", getOrderHistory);

// Admin-only routes
router.get("/", requireAdmin, allOrdersList);
router.get("/stats", requireAdmin, getOrderStats);
router.patch("/:orderId", requireAdmin, updateOrder);
router.delete("/:orderId", requireAdmin, deleteOrder);

module.exports = router;
