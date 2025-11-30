const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

// Define allowed origins for pure JWT cross-domain auth
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:3000",
  "https://localhost:3000",
].filter(Boolean);

// Enhanced CORS middleware for cross-domain production
const corsMiddleware = cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // In development, be more permissive
    if (process.env.NODE_ENV !== "production") {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
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
