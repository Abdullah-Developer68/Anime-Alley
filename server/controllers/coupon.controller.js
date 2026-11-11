const couponModel = require("../db/models/coupon.model.js");
const userModel = require("../db/models/user.model.js");
const dbConnect = require("../db/dbConnect.js");
const {
  validateCouponFields,
  validateCouponForUser,
} = require("../utils/coupon.utils.js");
const mongoose = require("mongoose");
const { parsePage } = require("../utils/validation.utils.js");
const { maskText } = require("../utils/privacy.utils.js");
const { clientError } = require("../utils/errors.utils.js");

const COUPONS_PER_PAGE = 20;
// Letters, digits, dashes and underscores; what fits on a promo banner
const COUPON_CODE_PATTERN = /^[A-Za-z0-9_-]{3,40}$/;

const checkCoupon = async (req, res) => {
  try {
    const couponCode = req.query?.code;

    if (typeof couponCode !== "string" || !couponCode.trim() || couponCode.length > 40)
      return res.status(400).json({ success: false, message: "Coupon code is required" });

    await dbConnect();

    const user = await userModel.findById(req.user?.id).select("couponCodeUsed").lean();

    // Shared rules: exists, not expired, not already used by this user
    const couponCheck = await validateCouponForUser(couponCode, user);
    if (!couponCheck.valid)
      return res.status(couponCheck.status).json({ success: false, message: couponCheck.message });
    const { coupon } = couponCheck;

    return res.status(200).json({
      success: true,
      message: "Coupon applied successfully",
      coupondata: {
        coupon: {
          couponCode: coupon.couponCode,
          discountPercentage: coupon.discountPercentage,
          expiryDate: coupon.expiryDate,
        },
      },
    });
  } catch (error) {
    console.error("Error checking coupon:", error);
    return res.status(500).json({ success: false, message: "Internal server error while checking coupon" });
  }
};

const getAllCoupons = async (req, res) => {
  try {
    const page = parsePage(req.query?.currPage);
    if (!page)
      return res.status(400).json({ success: false, message: "Current page must be a positive integer" });

    await dbConnect();

    // requireAdmin has already checked the role from the database. _id order is creation order.
    const [totalCoupons, coupons] = await Promise.all([
      couponModel.estimatedDocumentCount(),
      couponModel.find().sort({ _id: -1 }).skip((page - 1) * COUPONS_PER_PAGE).limit(COUPONS_PER_PAGE).lean(),
    ]);

    // A demo admin could otherwise read every live code and use it on a real order
    const allCoupons = req.user?.isDemo
      ? coupons.map((coupon) => ({ ...coupon, couponCode: maskText(coupon.couponCode, 2) }))
      : coupons;

    res.status(200).json({
      success: true,
      message: "Coupons fetched successfully",
      allCoupons,
      totalCoupons,
      totalPages: Math.ceil(totalCoupons / COUPONS_PER_PAGE),
    });
  } catch (error) {
    console.error("Error fetching all coupons:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const couponId = req.params?.couponId;
    if (!mongoose.isValidObjectId(couponId))
      return res.status(400).json({ success: false, message: "Invalid coupon id" });

    await dbConnect();

    const result = await couponModel.findByIdAndDelete(couponId);
    if (!result)
      return res.status(404).json({ success: false, message: "Coupon not found." });

    res.status(200).json({ success: true, message: `Coupon ${result.couponCode} has been deleted.` });
  } catch (error) {
    console.error("Error deleting coupon:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const updateCoupon = async (req, res) => {
  try {
    const couponId = req.params?.couponId;
    const { discountPercentage, expiryDate } = req.body || {};

    if (!mongoose.isValidObjectId(couponId))
      return res.status(400).json({ success: false, message: "Invalid coupon id" });

    const fieldValidation = validateCouponFields({ discountPercentage, expiryDate });
    if (!fieldValidation.valid)
      return res.status(fieldValidation.status).json({ success: false, message: fieldValidation.message });

    await dbConnect();

    // Only the fields that were sent change
    const update = {};
    if (discountPercentage !== undefined)
      update.discountPercentage = discountPercentage;
    if (expiryDate !== undefined)
      update.expiryDate = expiryDate;

    const updatedCoupon = await couponModel.findByIdAndUpdate(couponId, update, { new: true, runValidators: true }).lean();
    if (!updatedCoupon)
      return res.status(404).json({ success: false, message: "Coupon not found." });

    res.status(200).json({ success: true, message: "Coupon updated successfully.", coupon: updatedCoupon });
  } catch (error) {
    // Duplicate or invalid data gets a safe 409/400 instead of the raw database error
    const known = clientError(error);
    if (known)
      return res.status(known.status).json({ success: false, message: known.message });

    console.error("Error updating coupon:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const createCoupon = async (req, res) => {
  try {
    const { discountPercentage, expiryDate } = req.body || {};
    const couponCode = typeof req.body?.couponCode === "string" ? req.body.couponCode.trim() : "";

    if (!COUPON_CODE_PATTERN.test(couponCode))
      return res.status(400).json({
        success: false,
        message: "Coupon codes are 3 to 40 letters, digits, dashes or underscores.",
      });
    if (discountPercentage === undefined)
      return res.status(400).json({ success: false, message: "Missing required fields." });

    const fieldValidation = validateCouponFields({ discountPercentage, expiryDate });
    if (!fieldValidation.valid)
      return res.status(fieldValidation.status).json({ success: false, message: fieldValidation.message });

    await dbConnect();

    // requireAdmin has already checked the role. An expired coupon with the same code is replaced.
    const existing = await couponModel.findOne({ couponCode }).select("expiryDate").lean();
    if (existing) {
      if (existing.expiryDate > new Date())
        return res.status(400).json({ success: false, message: "Coupon with this code already exists and is still active." });
      await couponModel.deleteOne({ _id: existing._id });
    }

    const newCoupon = await couponModel.create({ couponCode, discountPercentage, expiryDate });
    res.status(201).json({ success: true, message: "Coupon created successfully.", coupon: newCoupon });
  } catch (error) {
    // Duplicate or invalid data gets a safe 409/400 instead of the raw database error
    const known = clientError(error);
    if (known)
      return res.status(known.status).json({ success: false, message: known.message });

    console.error("Error creating coupon:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const getCouponStats = async (req, res) => {
  try {
    await dbConnect();

    // Totals are summed in the database instead of loading every coupon
    const [stats] = await couponModel.aggregate([
      {
        $group: {
          _id: null,
          activeCoupons: { $sum: { $cond: [{ $gt: ["$expiryDate", new Date()] }, 1, 0] } },
          totalUsage: { $sum: { $ifNull: ["$totalUsage", 0] } },
          totalDiscount: { $sum: { $ifNull: ["$lifeTimeDiscount", 0] } },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      activeCoupons: stats?.activeCoupons || 0,
      totalUsage: stats?.totalUsage || 0,
      totalDiscount: stats?.totalDiscount || 0,
    });
  } catch (error) {
    console.error("Error getting coupon stats:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  checkCoupon,
  getAllCoupons,
  deleteCoupon,
  updateCoupon,
  createCoupon,
  getCouponStats,
};
