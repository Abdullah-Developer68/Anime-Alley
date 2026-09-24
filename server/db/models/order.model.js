const mongoose = require("mongoose");
const { Schema } = mongoose;
const { formatPrice } = require("../../utils/formatPrice.utils.js");

const orderSchema = new Schema(
  {
    orderID: {
      type: String,
      required: true,
      unique: true,
    },
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "products",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        price: {
          type: Number,
          required: true,
          set: (v) => formatPrice(v),
        },
      },
    ],
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    orderDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      // enum allows only specific values for the status field
      enum: ["pending", "processing", "shipped", "delivered"],
      default: "pending",
    },
    shippingAddress: {
      type: String,
      required: true,
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    stripeSessionID: {
      type: String,
      required: function () {
        if (this.paymentMethod === "stripe")
          return true;
      },
    },
    subtotal: {
      type: Number,
      required: true,
      set: (v) => formatPrice(v),
    },
    shippingCost: {
      type: Number,
      required: true,
      set: (v) => formatPrice(v),
    },
    discount: {
      type: Number,
      default: 0,
      set: (v) => formatPrice(v),
    },
    finalAmount: {
      type: Number,
      required: true,
      set: (v) => formatPrice(v),
    },
    couponCode: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("orders", orderSchema);
