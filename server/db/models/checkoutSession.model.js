const mongoose = require("mongoose");
const { Schema } = mongoose;

// Snapshot of exactly what a Stripe Checkout Session charges for.
// Written when the session is created and read by the webhook, so the order is built
// from what the customer actually paid for, NOT from whatever is in their cart when
// the payment completes (the cart can change while a session is still open).
const checkoutSessionSchema = new Schema(
  {
    stripeSessionID: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "users", required: true, index: true },
    products: [
      {
        _id: false,
        productId: { type: Schema.Types.ObjectId, ref: "products", required: true },
        variant: { type: String },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 0 }, // unit price at checkout time
      },
    ],
    couponId: { type: Schema.Types.ObjectId, ref: "coupons", default: null },
    couponCode: { type: String, default: null },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    shippingCost: { type: Number, required: true },
    // Exact amount Stripe will charge, in cents (sum of line items) - compared with session.amount_total
    amountTotalCents: { type: Number, required: true },
    currency: { type: String, required: true, default: "usd" },
    shippingAddress: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "completed", "expired"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("checkoutSessions", checkoutSessionSchema);
