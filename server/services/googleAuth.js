const passport = require("../config/passport/passport.js");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();
const dbConnect = require("../config/dbConnect.js");

const clientUrl = process.env.CLIENT_URL;

// Utility function to extract token from Authorization header or cookies
const extractToken = (req) => {
  // First, try to get token from Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }

  // Fallback to cookie-based token
  return req.cookies.token;
};

// Centralized cookie options - same as auth service
const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    // ...(isProduction &&
    //   process.env.COOKIE_DOMAIN && {
    //     domain: process.env.COOKIE_DOMAIN,
    //   }),
  };
};

/**
 * Step 1: Initial Authentication
 * Initiates the Google OAuth flow by redirecting to the consent screen.
 *
 * When the user clicks "Login with Google":
 * 1. Redirects to Google's authentication page
 * 2. Asks for permission to access profile and email
 * 3. No data verification yet - just requesting access
 */
const initiateGoogleAuth = (req, res, next) => {
  // passport.authenticate() returns a middleware function that needs to be executed
  // We execute it immediately with the current request context (req, res, next) Passport.js handles all the logic required
  // if the middleware is not executed then the authentication process will not start
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })(req, res, next);
};

/**
 * Step 2: Handle OAuth Callback
 * user grants permission and Google redirects back to this endpoint.
 * Processes the response after Google authenticates the user.
 *
 * Flow:
 * 1. Google redirects back with an authorization code
 * 2. Passport exchanges this code for access tokens
 * 3. Creates/updates user session if there is one
 * 4. Establishes authentication state
 */
const handleGoogleCallback = (req, res, next) => {
  dbConnect();
  const clientUrl =
    process.env.NODE_ENV === "production"
      ? process.env.CLIENT_URL
      : "http://localhost:5173";

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
        process.env.JWT_KEY
      );

      // Set JWT token in cookie as fallback (same as local auth)
      res.cookie("token", token, getCookieOptions());

      // Redirect to client with token as query parameter for localStorage storage
      return res.redirect(
        `${clientUrl}/auth/google/success?token=${encodeURIComponent(token)}`
      );
    } catch (tokenError) {
      console.error("JWT token creation error:", tokenError);
      return res.redirect(`${clientUrl}/login`);
    }
  })(req, res, next);
};

/**
 * Logout Function
 * Handles the complete logout process.
 *
 * Steps:
 * 1. Clears the user session
 * 2. Destroys session data
 * 3. Removes session cookie
 * 4. Redirects to home page
 */
const LogoutFromGoogle = async (req, res) => {
  try {
    // Pure JWT logout - same as main logout function
    const clearCookieOptions = {
      ...getCookieOptions(),
      expires: new Date(0),
      maxAge: 0,
    };
    console.log("Clearing cookie with options:", clearCookieOptions);
    // Clear the JWT cookie
    res.cookie("token", "", clearCookieOptions);

    // Redirect to client after clearing JWT cookie
    res.redirect(process.env.CLIENT_URL || clientUrl);
  } catch (error) {
    console.error("Google logout error:", error);
    res.status(500).json({ success: false, message: "Logout failed" });
  }
};

/**
 * Send User Data
 * Provides authenticated user information to the client.
 *
 * Process:
 * 1. First checks for session-based authentication (req.isAuthenticated())
 * 2. If no session, checks for JWT token in cookies
 * 3. Sends user profile if authenticated via either method
 * 4. Handles error cases appropriately
 */
const sendUserData = async (req, res) => {
  try {
    // Use utility function to extract token from Authorization header or cookies
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No authentication token found",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_KEY);

    res.status(200).json({
      success: true,
      user: {
        id: decoded.userid,
        username: decoded.username,
        email: decoded.email,
        profilePic: decoded.profilePic,
        role: decoded.role,
      },
    });
  } catch (error) {
    console.error("Token verification error:", error);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Authentication token expired",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

module.exports = {
  initiateGoogleAuth,
  LogoutFromGoogle,
  handleGoogleCallback,
  sendUserData,
};
