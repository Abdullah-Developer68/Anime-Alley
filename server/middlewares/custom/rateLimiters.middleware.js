const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const MongoRateLimitStore = require("./mongoRateLimitStore.js");

const MINUTE = 60 * 1000;

// IPv6 users get one key per /56 block, so they can't dodge limits by rotating addresses
const byIp = (req) => ipKeyGenerator(req.ip);
// After verifyTokenMiddleware: count per account, so users behind one shared IP don't block each other
const byUser = (req) => (req.user?.id ? `user:${req.user.id}` : byIp(req));

const createLimiter = ({ name, windowMs, limit, message, keyGenerator = byIp, skipSuccessfulRequests = false }) =>
  rateLimit({
    windowMs,
    limit,
    keyGenerator,
    skipSuccessfulRequests,
    store: new MongoRateLimitStore(name),
    // If the counter store is unreachable, serve the request rather than take the whole API down
    passOnStoreError: true,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { forwardedHeader: false },
    handler: (req, res) => res.status(429).json({ success: false, message }),
  });

// Baseline for every /api route, per IP
const apiLimiter = createLimiter({
  name: "api",
  windowMs: MINUTE,
  limit: 300,
  message: "Too many requests. Please slow down.",
});

// --- Auth (per IP, the user isn't known yet) ---

// Successful requests count too: every one sends an email, and all of them look the same (see sendSignupOtp)
const otpSendLimiter = createLimiter({
  name: "otp-send",
  windowMs: 15 * MINUTE,
  limit: 5,
  message: "Too many OTP requests from this IP, please try again later.",
});

const otpVerifyLimiter = createLimiter({
  name: "otp-verify",
  windowMs: 15 * MINUTE,
  limit: 10,
  skipSuccessfulRequests: true,
  message: "Too many OTP verification attempts from this IP, please try again later.",
});

const loginLimiter = createLimiter({
  name: "login",
  windowMs: 15 * MINUTE,
  limit: 5,
  message: "Too many login attempts from this IP. Please try again after 15 minutes.",
});

const signupLimiter = createLimiter({
  name: "signup",
  windowMs: 60 * MINUTE,
  limit: 3,
  message: "Too many accounts created from this IP. Please try again after 1 hour.",
});

// Every call creates a real user in the database
const demoLoginLimiter = createLimiter({
  name: "demo-login",
  windowMs: 60 * MINUTE,
  limit: 5,
  message: "Too many demo accounts created from this IP. Please try again after 1 hour.",
});

// Each open tab refreshes about every 15 minutes, so this leaves room for many tabs and shared IPs
const sessionLimiter = createLimiter({
  name: "session",
  windowMs: 15 * MINUTE,
  limit: 60,
  message: "Too many session requests. Please try again later.",
});

// Google login start, callback and code exchange
const googleAuthLimiter = createLimiter({
  name: "google-auth",
  windowMs: 15 * MINUTE,
  limit: 20,
  message: "Too many Google login attempts. Please try again later.",
});

// --- Public reads (per IP) ---

// Browsing is cheap; text search is a heavier query
const productSearchLimiter = rateLimit({
  windowMs: MINUTE,
  limit: (req) => {
    let constraints = {};
    try {
      constraints = JSON.parse(req.query?.productConstraints || "{}");
    } catch {
      constraints = {};
    }
    return constraints?.searchQuery ? 30 : 100;
  },
  keyGenerator: byIp,
  store: new MongoRateLimitStore("product-search"),
  passOnStoreError: true,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { forwardedHeader: false },
  handler: (req, res) => res.status(429).json({ success: false, message: "Too many requests. Please slow down." }),
});

// Order lookup after a Stripe redirect
const orderLookupLimiter = createLimiter({
  name: "order-lookup",
  windowMs: MINUTE,
  limit: 30,
  message: "Too many requests. Please slow down.",
});

// --- Logged-in actions (per user) ---

// Stops guessing coupon codes
const couponCheckLimiter = createLimiter({
  name: "coupon-check",
  windowMs: 15 * MINUTE,
  limit: 20,
  keyGenerator: byUser,
  message: "Too many coupon checks. Please try again later.",
});

// Each change runs a stock transaction
const cartWriteLimiter = createLimiter({
  name: "cart-write",
  windowMs: MINUTE,
  limit: 60,
  keyGenerator: byUser,
  message: "Too many cart changes. Please slow down.",
});

const placeOrderLimiter = createLimiter({
  name: "place-order",
  windowMs: 10 * MINUTE,
  limit: 10,
  keyGenerator: byUser,
  message: "Too many orders in a short time. Please try again later.",
});

// Each one creates a Stripe Checkout Session
const checkoutLimiter = createLimiter({
  name: "checkout",
  windowMs: 10 * MINUTE,
  limit: 10,
  keyGenerator: byUser,
  message: "Too many checkout attempts. Please try again later.",
});

// --- Admin (per user) ---

const adminWriteLimiter = createLimiter({
  name: "admin-write",
  windowMs: MINUTE,
  limit: 60,
  keyGenerator: byUser,
  message: "Too many changes in a short time. Please slow down.",
});

// PDF/Excel generation over whole collections is the most expensive request
const exportLimiter = createLimiter({
  name: "export",
  windowMs: MINUTE,
  limit: 5,
  keyGenerator: byUser,
  message: "Too many exports. Please wait a minute.",
});

module.exports = {
  apiLimiter,
  otpSendLimiter,
  otpVerifyLimiter,
  loginLimiter,
  signupLimiter,
  demoLoginLimiter,
  sessionLimiter,
  googleAuthLimiter,
  productSearchLimiter,
  orderLookupLimiter,
  couponCheckLimiter,
  cartWriteLimiter,
  placeOrderLimiter,
  checkoutLimiter,
  adminWriteLimiter,
  exportLimiter,
};
