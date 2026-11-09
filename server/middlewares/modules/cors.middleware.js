const cors = require("cors");
const dotenv = require("dotenv");
const { isTrustedOrigin } = require("../../utils/origin.utils.js");
dotenv.config();

// Only the allow-list in origin.utils.js, in every environment. There is no "allow everything
// outside production" fallback, so a deploy with a missing NODE_ENV stays locked down.
const corsMiddleware = cors({
  origin: function (origin, callback) {
    // Requests with no Origin header (Postman, server-to-server) aren't from a browser page
    if (!origin) return callback(null, true);

    return callback(null, isTrustedOrigin(origin));
  },
  // Auth uses the Authorization header, never cookies, so credentialed (cookie) requests are not allowed
  credentials: false,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  optionsSuccessStatus: 200, // For legacy browser support
  preflightContinue: false,
});

module.exports = corsMiddleware;
