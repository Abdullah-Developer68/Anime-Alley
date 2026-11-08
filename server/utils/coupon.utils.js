const couponModel = require("../db/models/coupon.model.js");
// Re-export validateCouponFields from centralized validation utilities
const { validateCouponFields } = require("./validation.utils.js");

// Single source of truth for "can this user apply this coupon right now?"
// Used by checkCoupon (cart preview), placeOrder (COD) and createCheckoutSession (Stripe)
// so every payment path enforces the same rules: the coupon exists, is not expired,
// and has not already been used by this user.
//
// couponCode - raw value from the client (must be a non-empty string)
// user       - user document (couponCodeUsed may be ObjectIds or populated coupon docs)
// options.session - optional mongoose session for use inside transactions
//
// Returns { valid: true, coupon } or { valid: false, status, message }
const validateCouponForUser = async (couponCode, user, { session = null } = {}) => {
  // Reject non-strings so objects such as {"$ne": null} can never reach the query
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

  const alreadyUsed = (user.couponCodeUsed || []).some(
    (used) => String(used?._id ?? used) === String(coupon._id),
  );
  if (alreadyUsed)
    return { valid: false, status: 400, message: "Coupon already used" };

  return { valid: true, coupon };
};

module.exports = { validateCouponFields, validateCouponForUser };
