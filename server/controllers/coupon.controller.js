const couponModel = require("../models/coupon.model.js");
const userModel = require("../models/user.model.js");
const dbConnect = require("../config/dbConnect.js");

const checkCoupon = async (req, res) => {
  await dbConnect();

  // Get email from verified token
  const userEmail = req.user.email;
  const { couponCode } = req.body;

  if (!couponCode) {
    return res.status(400).json({
      success: false,
      message: "Coupon code is required",
    });
  }

  try {
    // Find the coupon
    const coupon = await couponModel.findOne({ couponCode });
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    // Check if coupon is expired
    if (coupon.expiryDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Coupon has expired",
      });
    }

    // Find user
    const user = await userModel
      .findOne({ email: userEmail })
      .populate("couponCodeUsed");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if coupon was already used
    const isCouponUsed = user.couponCodeUsed.some(
      (usedCoupon) => usedCoupon._id.toString() === coupon._id.toString(),
    );

    if (isCouponUsed) {
      return res.status(400).json({
        success: false,
        message: "Coupon already used",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Coupon applied successfully",
      coupondata: {
        coupon,
        userCoupons: user.couponCodeUsed,
      },
    });
  } catch (error) {
    console.error("Error checking coupon:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while checking coupon",
    });
  }
};

const getAllCoupons = async (req, res) => {
  await dbConnect();

  // Get email from verified token
  const viewerEmail = req.user.email;
  const { currPage } = req.query;

  // Validate required parameters
  if (!currPage) {
    return res.status(400).json({
      message: "Current page is required!",
    });
  }

  try {
    // Verify admin role from database (ultra-secure)
    const adminUser = await userModel.findOne({ email: viewerEmail });
    if (
      !adminUser ||
      (adminUser.role !== "admin" && adminUser.role !== "superAdmin")
    ) {
      return res.status(403).json({ message: "User is not authorized!" });
    }

    // --- Pagination Logic ---
    const couponsPerPage = 20;
    const page = parseInt(currPage, 10) || 1;
    const startIndex = (page - 1) * couponsPerPage;

    // Get the total count of all coupons
    const totalCoupons = await couponModel.countDocuments();

    // Calculate total pages
    const totalPages = Math.ceil(totalCoupons / couponsPerPage);

    // Fetch paginated coupons, sorting by most recent
    const allCoupons = await couponModel
      .find()
      .sort({ createdAt: -1 }) // Sort by most recently created
      .skip(startIndex)
      .limit(couponsPerPage);

    // Respond with paginated coupon data
    res.status(200).json({
      success: true,
      message: "Coupons fetched successfully",
      allCoupons,
      totalCoupons,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching all coupons:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const deleteCoupon = async (req, res) => {
  await dbConnect();

  try {
    const { couponId } = req.params;

    if (!couponId) {
      return res.status(400).json({ message: "Coupon ID is required." });
    }

    const result = await couponModel.findByIdAndDelete(couponId);

    if (!result) {
      return res.status(404).json({ message: "Coupon not found." });
    }

    res.status(200).json({
      success: true,
      message: `Coupon with ID: ${couponId} has been deleted.`,
    });
  } catch (error) {
    console.error("Error deleting coupon:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};

const updateCoupon = async (req, res) => {
  await dbConnect();

  try {
    const { couponId } = req.params;
    const { discountPercentage, expiryDate } = req.body;

    if (!couponId) {
      return res.status(400).json({ message: "Coupon ID is required." });
    }

    const updatedCoupon = await couponModel.findByIdAndUpdate(
      couponId,
      { discountPercentage, expiryDate },
      { new: true, runValidators: true },
    );

    if (!updatedCoupon) {
      return res.status(404).json({ message: "Coupon not found." });
    }

    res.status(200).json({
      success: true,
      message: "Coupon updated successfully.",
      coupon: updatedCoupon,
    });
  } catch (error) {
    console.error("Error updating coupon:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};

const createCoupon = async (req, res) => {
  await dbConnect();

  try {
    // Get email from verified token
    const email = req.user.email;
    const { couponCode, discountPercentage, expiryDate } = req.body;

    if (!couponCode || !discountPercentage) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields." });
    }

    // Verify admin role from database (ultra-secure)
    const user = await userModel.findOne({ email });
    if (!user || (user.role !== "admin" && user.role !== "superAdmin")) {
      return res
        .status(403)
        .json({ success: false, message: "User is not authorized!" });
    }

    // Check for existing coupon with same code
    const existing = await couponModel.findOne({ couponCode });
    if (existing) {
      if (existing.expiryDate > new Date()) {
        return res.status(400).json({
          success: false,
          message: "Coupon with this code already exists and is still active.",
        });
      } else {
        // Remove expired coupon
        await couponModel.deleteOne({ _id: existing._id });
      }
    }

    // Create new coupon
    const newCoupon = await couponModel.create({
      couponCode,
      discountPercentage,
      expiryDate,
    });
    res.status(201).json({
      success: true,
      message: "Coupon created successfully.",
      coupon: newCoupon,
    });
  } catch (error) {
    console.error("Error creating coupon:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};

const getCouponStats = async (req, res) => {
  await dbConnect();

  try {
    // Get email from verified token
    const email = req.user.email;

    // Verify admin role from database (ultra-secure)
    const user = await userModel.findOne({ email });
    if (!user || (user.role !== "admin" && user.role !== "superAdmin")) {
      return res.status(403).json({ message: "User is not authorized!" });
    }

    const now = new Date();
    const activeCoupons = await couponModel.countDocuments({
      expiryDate: { $gt: now },
    });
    const allCoupons = await couponModel.find();
    const totalUsage = allCoupons.reduce(
      (sum, c) => sum + (c.totalUsage || 0),
      0,
    );
    const totalDiscount = allCoupons.reduce(
      (sum, c) => sum + (c.lifeTimeDiscount || 0),
      0,
    );

    res.status(200).json({
      success: true,
      activeCoupons,
      totalUsage,
      totalDiscount,
    });
  } catch (error) {
    console.error("Error getting coupon stats:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
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
