const rateLimit = require("express-rate-limit");

const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // limit each IP to 3 requests per windowMs
  message: {
    success: false,
    message: "Too many OTP requests from this IP, please try again later.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: true, // Tells the rate limiter to ignore (not count) requests that result in a successful response (usually HTTP status codes 2xx).
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many OTP requests from this IP, please try again later.",
    });
  },
});

const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    success: false,
    message:
      "Too many OTP verification attempts from this IP, please try again later.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: true, // Tells the rate limiter to ignore (not count) requests that result in a successful response (usually HTTP status codes 2xx).
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message:
        "Too many OTP verification attempts from this IP, please try again later.",
    });
  },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes per IP
  message: {
    success: false,
    message:
      "Too many login attempts from this IP. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message:
        "Too many login attempts from this IP. Please try again after 15 minutes.",
    });
  },
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 signups per hour per IP
  message: {
    success: false,
    message:
      "Too many accounts created from this IP. Please try again after 1 hour.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message:
        "Too many accounts created from this IP. Please try again after 1 hour.",
    });
  },
});

// Rate limiter for search endpoint
const productSearchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: (req) => {
    const constraints = JSON.parse(req.query.productConstraints || "{}");

    // Higher limit for simple browsing (no search)
    if (!constraints.searchQuery) {
      return 100; // 100 requests/min for browsing
    }

    // Stricter limit for text search (expensive DB queries)
    return 30; // 30 requests/min for searching
  },
  message: {
    success: false,
    message: "Too many requests. Please slow down.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many requests. Please slow down.",
    });
  },
});
module.exports = {
  otpSendLimiter,
  otpVerifyLimiter,
  loginLimiter,
  signupLimiter,
  productSearchLimiter,
};
