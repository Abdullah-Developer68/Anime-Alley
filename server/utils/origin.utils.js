// Centralized origin validation utility for CORS and third-party redirect services
const dotenv = require("dotenv");
dotenv.config();

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

// Validates whether an origin is trusted for CORS and redirect operations
const isTrustedOrigin = (origin) => {
  if (!origin || typeof origin !== "string") return false;

  const configuredClientUrls = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(",").map((url) => url.trim())
    : [];

  if (configuredClientUrls.includes(origin)) return true;
  if (isOwnVercelOrigin(origin)) return true;

  // Localhost development support
  if (
    origin === "http://localhost:5173" ||
    origin === "http://localhost:3000" ||
    origin === "https://localhost:3000"
  )
    return true;

  return false;
};

// Extracts and validates incoming request origin for safe redirect construction
const resolveTrustedClientOrigin = (req) => {
  const rawOrigin = req.headers?.origin || req.headers?.referer;
  if (!rawOrigin || typeof rawOrigin !== "string")
    return process.env.CLIENT_URL || "http://localhost:5173";

  try {
    const parsedOrigin = new URL(rawOrigin).origin;
    if (isTrustedOrigin(parsedOrigin))
      return parsedOrigin;
  } catch (e) {
    // Return safe default fallback on URL parse error
  }

  return process.env.CLIENT_URL || "http://localhost:5173";
};

module.exports = {
  isOwnVercelOrigin,
  isTrustedOrigin,
  resolveTrustedClientOrigin,
};

