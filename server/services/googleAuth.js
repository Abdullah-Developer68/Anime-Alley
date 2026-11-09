const passport = require("../config/passport/passport.js");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();
const dbConnect = require("../db/dbConnect.js");
const userModel = require("../db/models/user.model.js");
const { isNonEmptyString } = require("../utils/validation.utils.js");
const {
  isValidChallenge,
  challengeFromVerifier,
  challengesMatch,
  signHandoffCode,
  readHandoffCode,
} = require("../utils/googleHandoff.utils.js");

const getClientUrl = () =>
  process.env.NODE_ENV === "production"
    ? process.env.CLIENT_URL
    : "http://localhost:5173";

// Step 1: GET /googleAuth/login?challenge=...
// The client keeps a random verifier in sessionStorage and sends only its SHA-256 hash (the challenge).
// The challenge travels to Google and back inside the signed OAuth `state` (see GoogleStrategy.js).
const initiateGoogleAuth = (req, res, next) => {
  if (!isValidChallenge(req.query?.challenge))
    return res.redirect(`${getClientUrl()}/login`);

  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })(req, res, next);
};

// Step 2: GET /googleAuth/callback, where Google redirects back.
// Passport rejects a missing, forged or expired `state` before it exchanges Google's code.
const handleGoogleCallback = async (req, res, next) => {
  const clientUrl = getClientUrl();

  try {
    await dbConnect();
  } catch (error) {
    console.error("Database connection error in Google callback:", error);
    return res.redirect(`${clientUrl}/login`);
  }

  passport.authenticate("google", { session: false }, (err, user) => {
    if (err || !user) {
      console.error("Google authentication failed:", err || "no user returned");
      return res.redirect(`${clientUrl}/login`);
    }

    // The JWT never goes in the URL. The fragment (#) is not sent to servers or in Referer headers,
    // and the code is useless without the verifier held by the tab that started the login.
    const code = signHandoffCode(user._id, req.googleLoginChallenge);
    return res.redirect(`${clientUrl}/auth/google/success#code=${encodeURIComponent(code)}`);
  })(req, res, next);
};

// Step 3: POST /googleAuth/token { code, verifier } swaps the handoff code for the login JWT
const exchangeGoogleCode = async (req, res) => {
  const { code, verifier } = req.body || {};
  if (!isNonEmptyString(code) || !isNonEmptyString(verifier))
    return res.status(400).json({ success: false, message: "Code and verifier are required" });

  const payload = readHandoffCode(code);
  // A code planted by someone else (login CSRF) fails here, because this browser has a different verifier
  if (!payload || !challengesMatch(challengeFromVerifier(verifier), payload.challenge))
    return res.status(401).json({ success: false, message: "Google login could not be completed" });

  try {
    await dbConnect();
    const user = await userModel.findById(payload.uid);
    if (!user)
      return res.status(401).json({ success: false, message: "Google login could not be completed" });

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

    return res.status(200).json({ success: true, token });
  } catch (error) {
    console.error("Google code exchange error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  initiateGoogleAuth,
  handleGoogleCallback,
  exchangeGoogleCode,
};
