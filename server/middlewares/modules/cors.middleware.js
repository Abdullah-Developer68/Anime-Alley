const cors = require("cors");
const dotenv = require("dotenv");
const { isTrustedOrigin, isOwnVercelOrigin } = require("../../utils/origin.utils.js");
dotenv.config();

// Enhanced CORS middleware for cross-domain production
const corsMiddleware = cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, server-to-server, etc.)
    if (!origin) return callback(null, true);

    if (isTrustedOrigin(origin)) return callback(null, true);

    // In development, be more permissive
    if (process.env.NODE_ENV !== "production") return callback(null, true);

    return callback(null, false);
  },
  credentials: true, // Essential for cross-domain cookies
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  exposedHeaders: ["Set-Cookie"], // Allow client to see Set-Cookie header
  optionsSuccessStatus: 200, // For legacy browser support
  preflightContinue: false,
});

module.exports = corsMiddleware;
