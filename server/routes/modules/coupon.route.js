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

// Apply authentication to all routes
router.use(verifyTokenMiddleware); // 1st middleware

// Public route - any authenticated user can verify coupons
router.post("/verify", checkCoupon);

// Admin-only routes - require admin role (2nd middleware)
router.get("/allCoupons", requireAdmin, getAllCoupons);
router.delete("/delete/:couponId", requireAdmin, deleteCoupon);
router.put("/update/:couponId", requireAdmin, updateCoupon);
router.post("/createCoupon", requireAdmin, createCoupon);
router.get("/stats", requireAdmin, getCouponStats);

module.exports = router;
