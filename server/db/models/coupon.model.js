const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
  couponCode: {
    type: String,
    required: true,
  },
  discountPercentage: {
    type: Number,
    required: true,
  },
  expiryDate: {
    type: Date,
    required: true,
    default: () => new Date(+new Date() + 30 * 24 * 60 * 60 * 1000), // Default 30 days from creation
  },
  totalUsage: {
    type: Number,
    default: 0,
  },
  lifeTimeDiscount: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model("coupons", couponSchema);
