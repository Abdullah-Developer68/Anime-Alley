const express = require("express");
const router = express.Router();
const {
  verifyTokenMiddleware,
} = require("../../middlewares/custom/auth.middleware.js");
const {
  reserveStock,
  getCart,
  updateCartItem,
  clearCart,
} = require("../../controllers/reservation.controller.js");

// All cart routes require authentication
router.use(verifyTokenMiddleware);

router.get("/", getCart);
router.delete("/", clearCart);
// Adding an item reserves its stock; a cart item is identified by productId + variant
router.post("/items", reserveStock);
router.patch("/items/:productId", updateCartItem);

module.exports = router;
