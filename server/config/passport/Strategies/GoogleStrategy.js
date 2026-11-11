const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../../../db/models/user.model.js");
const dotenv = require("dotenv");
const { signLoginState, readLoginState } = require("../../../utils/googleHandoff.utils.js");
dotenv.config();

// Google sends email_verified as a boolean (older responses used the string "true")
const isVerified = (entry) => entry?.verified === true || entry?.verified === "true";

const findOrCreateUser = async (profile) => {
  const user = await User.findOne({ googleId: profile.id });
  if (user)
    return user;

  const emailEntry = profile.emails?.[0];
  const email = typeof emailEntry?.value === "string" ? emailEntry.value.trim().toLowerCase() : "";
  // Linking to an account by email is only safe when Google has confirmed the address belongs to this person
  if (!email || !isVerified(emailEntry))
    throw new Error("Google account has no verified email");

  const photo = profile.photos?.[0]?.value;
  const existing = await User.findOne({ email });
  if (!existing)
    return User.create({
      googleId: profile.id,
      email,
      username: profile.displayName || email.split("@")[0],
      profilePic: photo,
      accountStatus: "active",
    });

  existing.googleId = profile.id;
  if (!existing.profilePic)
    existing.profilePic = photo;
  // Anyone can start a signup with someone else's address. The verified owner signing in with
  // Google takes that unfinished signup over instead of being locked out by it.
  if (existing.accountStatus === "verifying") {
    existing.accountStatus = "active";
    existing.username = profile.displayName || existing.username;
    existing.password = undefined;
    existing.otp = undefined;
    existing.otpExpiry = undefined;
    existing.otpAttempts = undefined;
    existing.isOtpVerified = false;
  }
  await existing.save();
  return existing;
};

// Stateless replacement for passport's session-based `state: true` (the app has no sessions).
// initiateGoogleAuth has already checked the challenge before this runs.
const googleStateStore = {
  store(req, meta, callback) {
    callback(null, signLoginState(req.query?.challenge));
  },
  verify(req, state, callback) {
    const payload = readLoginState(state);
    if (!payload)
      return callback(null, false, { message: "Invalid OAuth state" });
    req.googleLoginChallenge = payload.challenge;
    callback(null, true);
  },
};

const callbackURL =
  process.env.NODE_ENV === "production"
    ? process.env.GOOGLE_CALLBACK_URL
    : "http://localhost:3000/api/googleAuth/callback";

const GoogleProvider = new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL,
    store: googleStateStore,
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const user = await findOrCreateUser(profile);
      return done(null, user);
    } catch (error) {
      console.error("Google Strategy Error:", error.message);
      return done(error, null);
    }
  },
);

module.exports = GoogleProvider;
