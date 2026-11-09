const mongoose = require("mongoose");
const { Schema } = mongoose;

// One document per limiter, client and time window, e.g. "login:203.0.113.7:1731150000000".
// MongoDB deletes it once the window is over.
const rateLimitSchema = new Schema(
  {
    _id: { type: String },
    hits: { type: Number, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { versionKey: false },
);

module.exports = mongoose.model("rateLimits", rateLimitSchema);
