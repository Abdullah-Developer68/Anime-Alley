const couponModel = require("../db/models/coupon.model.js");
const { validateCouponFields } = require("./validation.utils.js");

// Shared coupon rules for every payment path: exists, not expired, not already used by this user
const validateCouponForUser = async (couponCode, user, { session = null } = {}) => {
  // Non-strings are rejected so query operators like {"$ne": null} never reach MongoDB
  if (typeof couponCode !== "string" || !couponCode.trim())
    return { valid: false, status: 400, message: "Coupon code must be a non-empty string" };

  if (!user)
    return { valid: false, status: 404, message: "User not found" };

  let query = couponModel.findOne({ couponCode: couponCode.trim() });
  if (session)
    query = query.session(session);
  const coupon = await query;

  if (!coupon)
    return { valid: false, status: 404, message: "Coupon not found" };

  if (!coupon.expiryDate || coupon.expiryDate < new Date())
    return { valid: false, status: 400, message: "Coupon has expired" };

  // couponCodeUsed may hold ObjectIds or populated coupon documents
  const alreadyUsed = (user.couponCodeUsed || []).some(
    (used) => String(used?._id ?? used) === String(coupon._id),
  );
  if (alreadyUsed)
    return { valid: false, status: 400, message: "Coupon already used" };

  return { valid: true, coupon };
};

module.exports = { validateCouponFields, validateCouponForUser };
