const express = require("express");
const dotenv = require("dotenv");
const passport = require("./config/passport/passport.js");

dotenv.config(); // Load environment variables from .env file

const path = require("path"); // Use path module for file paths
const port = process.env.PORT;
const app = express();

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

// Automatic clean up scripts using cron
require("./utils/cleanUpUsers.js"); // automaically cleans unverified users that were created a Week Ago
require("./utils/cleanUpReservation.js"); // automatically cleans up expired reservations

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

app.listen(port, () => {
  console.log(`Server is running at: http://localhost:${port}`);
});

module.exports = app; // <-- Add this line for Vercel
