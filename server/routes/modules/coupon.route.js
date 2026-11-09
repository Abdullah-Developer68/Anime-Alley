const express = require("express");
const router = express.Router();
const {
  verifyTokenMiddleware,
  requireAdmin,
} = require("../../middlewares/custom/auth.middleware.js");
const {
  checkCoupon,
  getAllCoupons,
  deleteCoupon,
  updateCoupon,
  createCoupon,
  getCouponStats,
} = require("../../controllers/coupon.controller.js");
const {
  couponCheckLimiter,
  adminWriteLimiter,
} = require("../../middlewares/custom/rateLimiters.middleware.js");

// Apply authentication to all routes
router.use(verifyTokenMiddleware);

// Any logged-in user: can this user apply the coupon in ?code=
router.get("/eligibility", couponCheckLimiter, checkCoupon);

// Admin-only routes
router.get("/", requireAdmin, getAllCoupons);
router.get("/stats", requireAdmin, getCouponStats);
router.post("/", requireAdmin, adminWriteLimiter, createCoupon);
router.patch("/:couponId", requireAdmin, adminWriteLimiter, updateCoupon);
router.delete("/:couponId", requireAdmin, adminWriteLimiter, deleteCoupon);

module.exports = router;
