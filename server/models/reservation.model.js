const mongoose = require("mongoose");
const { Schema } = mongoose;

const reservationSchema = new Schema({
  cartId: {
    type: String,
    required: false, // Make optional for backward compatibility
    index: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "users",
    required: false, // Will be required for new carts
    index: true,
  },
  products: [
    {
      productId: {
        type: Schema.Types.ObjectId,
        ref: "products",
        required: true,
      },
      variant: {
        type: String, // e.g., size or volume
        required: false,
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
    },
  ],
  reservedAt: {
    type: Date,
    default: Date.now,
    index: true,
    expires: 172800, // 2 days in seconds
  },
});

// Compound index for efficient queries
reservationSchema.index({
  userId: 1,
  "products.productId": 1,
  "products.variant": 1,
});

module.exports = mongoose.model("reservations", reservationSchema);
