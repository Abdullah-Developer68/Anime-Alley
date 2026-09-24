/**
 * Formats a price to ensure it has at most 2 decimal places.
 * If the price has more than 2 decimal places, it rounds it off.
 *
 * @param {number|string} price - The price value to format.
 * @param {Object} [options] - Optional formatting options.
 * @param {boolean} [options.asString=false] - If true, returns a string formatted with toFixed(2).
 * @returns {number|string} Formatted price.
 */
const formatPrice = (price, { asString = false } = {}) => {
  const num = Number(price);
  if (isNaN(num) || !Number.isFinite(num)) {
    return asString ? "0.00" : 0;
  }
  const epsilon = num >= 0 ? Number.EPSILON : -Number.EPSILON;
  const rounded = Math.round((num + epsilon) * 100) / 100;
  const normalized = Object.is(rounded, -0) ? 0 : rounded;
  return asString ? normalized.toFixed(2) : normalized;
};

module.exports = {
  formatPrice,
};
