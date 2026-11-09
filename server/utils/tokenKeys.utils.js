const crypto = require("crypto");

// Each purpose gets its own key derived from JWT_KEY, so a token made for one purpose
// (OAuth state, signup verification, OTP hash) is never accepted for another, or as a login token
const keyFor = (purpose) =>
  crypto.createHmac("sha256", process.env.JWT_KEY).update(purpose).digest("hex");

module.exports = { keyFor };
