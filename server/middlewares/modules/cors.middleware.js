const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

// Define allowed origins for pure JWT cross-domain auth
const configuredClientUrls = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((url) => url.trim())
  : [];

const allowedOrigins = [
  ...configuredClientUrls,
  "http://localhost:5173",
  "http://localhost:3000",
  "https://localhost:3000",
].filter(Boolean);

// Strict validator restricted strictly to your verified project and team scope on Vercel
const isOwnVercelOrigin = (origin) => {
  if (typeof origin !== "string") return false;

  // Specific known production domains registered to this project
  if (
    origin === "https://anime-alley-client.vercel.app" ||
    origin === "https://anime-alley-beige.vercel.app"
  )
    return true;

  // Strict regex for team-scoped preview deployments
  // Matches exclusively: https://anime-alley-client-<subdomain>-developers-projects-86df454e.vercel.app
  const teamScopedPattern =
    /^https:\/\/anime-alley-client-[a-zA-Z0-9-]+-developers-projects-86df454e\.vercel\.app$/;
  return teamScopedPattern.test(origin);
};

// Enhanced CORS middleware for cross-domain production
const corsMiddleware = cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, server-to-server, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) return callback(null, true);

    // Allow strictly verified project deployments under your Vercel team scope
    if (isOwnVercelOrigin(origin)) return callback(null, true);

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
