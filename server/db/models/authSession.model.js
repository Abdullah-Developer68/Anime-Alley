const mongoose = require("mongoose");
const { Schema } = mongoose;

// One document per logged-in device. Deleting it revokes that device's refresh token
// and, because the auth middleware checks it on every request, its access token too.
const authSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "users", required: true, index: true },
    // SHA-256 of the refresh token; the token itself is never stored
    tokenHash: { type: String, required: true, unique: true },
    // Idle timeout, pushed back on every refresh. MongoDB deletes the document once it passes.
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    // Hard limit: refreshing never extends a session past this
    absoluteExpiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("authSessions", authSessionSchema);
