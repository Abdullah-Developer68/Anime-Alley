/**
 * Validates coupon fields shared between createCoupon and updateCoupon.
 *
 * @param {object} options
 * @param {*}        options.discountPercentage - Value to validate (pass undefined to skip)
 * @param {*}        options.expiryDate         - Value to validate (pass undefined to skip)
 * @returns {{ valid: false, status: number, message: string } | { valid: true }}
 */
const validateCouponFields = ({ discountPercentage, expiryDate }) => {
  if (discountPercentage !== undefined) {
    if (
      typeof discountPercentage !== "number" ||
      discountPercentage <= 0 ||
      discountPercentage > 100
    ) {
      return {
        valid: false,
        status: 400,
        message: "Discount percentage must be a number between 1 and 100",
      };
    }
  }

  if (expiryDate !== undefined) {
    const parsed = new Date(expiryDate);
    if (isNaN(parsed.getTime())) {
      return {
        valid: false,
        status: 400,
        message: "Invalid expiry date",
      };
    }
  }

  return { valid: true };
};

module.exports = { validateCouponFields };
