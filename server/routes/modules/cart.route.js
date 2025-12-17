const express = require("express");
const router = express.Router();
const {
  verifyTokenMiddleware,
} = require("../../middlewares/custom/auth.middleware.js");
const {
  getCart,
  updateCartItem,
  clearCart,
} = require("../../controllers/reservation.controller.js");

// All cart routes require authentication
router.use(verifyTokenMiddleware);

router.post("/", getCart);
router.put("/update", updateCartItem);
router.delete("/clear", clearCart);

module.exports = router;
