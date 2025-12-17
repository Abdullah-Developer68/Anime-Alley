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
  verifyOrder
} = require("../../controllers/order.controller.js");

// All order routes require authentication
router.use(verifyTokenMiddleware);

// POST
router.post("/placeOrder", placeOrder);
// GET
router.get("/getOrders", getOrderHistory);
router.get("/allOrdersList", requireAdmin, allOrdersList);
router.get("/orderStats", requireAdmin, getOrderStats);
router.get("/verifyOrder", verifyOrder)
// DELETE
router.delete("/delete/:orderId", requireAdmin, deleteOrder);
// UPDATE
router.put("/update/:orderId", requireAdmin, updateOrder);

module.exports = router;
