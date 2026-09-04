const express = require("express");
const dotenv = require("dotenv");
const passport = require("./config/passport/passport.js");

dotenv.config(); // Load environment variables from .env file

const path = require("path"); // Use path module for file paths
const port = process.env.PORT;
const app = express();

// Trust reverse proxy in production, Vercel/Lambda, or test environments
const isBehindProxy = Boolean(
  process.env.TRUST_PROXY ||
  process.env.VERCEL ||
  process.env.VERCEL_ENV ||
  process.env.NOW_REGION ||
  process.env.LAMBDA_TASK_ROOT ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.AWS_EXECUTION_ENV ||
  process.env.NODE_ENV === "production" ||
  process.env.NODE_ENV === "test"
);
if (isBehindProxy)
  app.set("trust proxy", 1);

// Stripe webhook must be registered before any body parser middleware because Stripe webhooks
// must use raw body parsing while regular API routes use JSON body parsing to handle requests
//  and so that is why it is not in strip.routes.js
const { handleStripeWebhook } = require("./hooks/stripeWebHook.js");

app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

// Import middlewares and executes them
require("./middlewares/index.middleware.js")(app);

// Note: Cleanup utilities are now handled by Vercel Cron Jobs
// See vercel.json for cron configuration that calls /api/cleanup/* endpoints

// Custom middlewares
app.use(passport.initialize()); // Still needed for Google OAuth
// app.use(passport.session()); // Removed - using JWT instead of sessions
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // Serve static files from the "uploads" directory

// Import all routes
const routes = require("./routes/index.routes.js");

// Routes
app.use("/api", routes);

app.get("/", (req, res) => {
  res.send("Backend is running!");
});

// Global error-handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);
  if (res.headersSent)
    return next(err);
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

if (process.env.NODE_ENV !== "test")
  app.listen(port, () => {
    console.log(`Server is running at: http://localhost:${port}`);
  });

module.exports = app; // <-- Add this line for Vercel
