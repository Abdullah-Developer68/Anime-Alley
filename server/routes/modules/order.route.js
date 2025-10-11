const express = require("express");
const router = express.Router();
const verifyTokenMiddleware = require("../../middlewares/custom/auth.middleware.js");
const {
  requireAdmin,
} = require("../../middlewares/custom/roleAuth.middleware.js");
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

// POST
router.post("/placeOrder", placeOrder);
// GET
router.get("/getOrders", getOrderHistory);
router.get("/allOrdersList", requireAdmin, allOrdersList);
router.get("/orderStats", requireAdmin, getOrderStats);
// DELETE
router.delete("/delete/:orderId", requireAdmin, deleteOrder);
// UPDATE
router.put("/update/:orderId", requireAdmin, updateOrder);

module.exports = router;
