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

// Apply authentication to all routes
router.use(verifyTokenMiddleware);

// Any logged-in user: can this user apply the coupon in ?code=
router.get("/eligibility", checkCoupon);

// Admin-only routes
router.get("/", requireAdmin, getAllCoupons);
router.get("/stats", requireAdmin, getCouponStats);
router.post("/", requireAdmin, createCoupon);
router.patch("/:couponId", requireAdmin, updateCoupon);
router.delete("/:couponId", requireAdmin, deleteCoupon);

module.exports = router;
