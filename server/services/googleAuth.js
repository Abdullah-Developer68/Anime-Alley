const passport = require("../config/passport/passport.js");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();
const dbConnect = require("../db/dbConnect.js");

// Step 1: Initial Authentication
// Initiates the Google OAuth flow by redirecting to the consent screen.
//
// When the user clicks "Login with Google":
// 1. Redirects to Google's authentication page
// 2. Asks for permission to access profile and email
// 3. No data verification yet - just requesting access
const initiateGoogleAuth = (req, res, next) => {
  // passport.authenticate() returns a middleware function that needs to be executed
  // We execute it immediately with the current request context (req, res, next) Passport.js handles all the logic required
  // if the middleware is not executed then the authentication process will not start
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })(req, res, next);
};

// Step 2: Handle OAuth Callback
// user grants permission and Google redirects back to this endpoint.
// Processes the response after Google authenticates the user.
//
// Flow:
// 1. Google redirects back with an authorization code
// 2. Passport exchanges this code for access tokens
// 3. Creates/updates user session if there is one
// 4. Establishes authentication state
const handleGoogleCallback = async (req, res, next) => {
  const clientUrl =
    process.env.NODE_ENV === "production"
      ? process.env.CLIENT_URL
      : "http://localhost:5173";

  try {
    await dbConnect();
  } catch (error) {
    console.error("Database connection error in Google callback:", error);
    return res.redirect(`${clientUrl}/login`);
  }

  // Use custom callback to avoid session requirement
  passport.authenticate("google", { session: false }, (err, user, info) => {
    if (err) {
      console.error("Google authentication error:", err);
      return res.redirect(`${clientUrl}/login`);
    }

    if (!user) {
      console.error("No user returned from Google auth");
      return res.redirect(`${clientUrl}/login`);
    }

    try {
      // Create JWT token with user data (same structure as local auth)
      const token = jwt.sign(
        {
          userid: user._id,
          email: user.email,
          username: user.username,
          profilePic: user.profilePic,
          role: user.role,
        },
        process.env.JWT_KEY,
        { expiresIn: "7d" },
      );

      // Redirect to client with token as query parameter for localStorage storage
      return res.redirect(
        `${clientUrl}/auth/google/success?token=${encodeURIComponent(token)}`,
      );
    } catch (tokenError) {
      console.error("JWT token creation error:", tokenError);
      return res.redirect(`${clientUrl}/login`);
    }
  })(req, res, next);
};

module.exports = {
  initiateGoogleAuth,
  handleGoogleCallback,
};
