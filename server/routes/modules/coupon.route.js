const express = require("express");
const router = express.Router();
const verifyTokenMiddleware = require("../../middlewares/custom/auth.middleware.js");
const {
  requireAdmin,
} = require("../../middlewares/custom/roleAuth.middleware.js");
const {
  checkCoupon,
  getAllCoupons,
  deleteCoupon,
  updateCoupon,
  createCoupon,
  getCouponStats,
} = require("../../controllers/coupon.controller.js");

// Public route - authenticated users can verify coupons
router.post("/verify", verifyTokenMiddleware, checkCoupon);

// Protected routes - require authentication
router.use(verifyTokenMiddleware);

// Admin-only routes
router.get("/allCoupons", requireAdmin, getAllCoupons);
router.delete("/delete/:couponId", requireAdmin, deleteCoupon);
router.put("/update/:couponId", requireAdmin, updateCoupon);
router.post("/createCoupon", requireAdmin, createCoupon);
router.get("/stats", requireAdmin, getCouponStats);

module.exports = router;
