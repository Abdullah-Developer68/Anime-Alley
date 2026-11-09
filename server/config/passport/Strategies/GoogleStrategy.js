const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../../../db/models/user.model.js");
const dotenv = require("dotenv");
const { signLoginState, readLoginState } = require("../../../utils/googleHandoff.utils.js");
dotenv.config();

const findOrCreateUser = async (profile) => {
  try {
    // First, try to find by googleId
    let user = await User.findOne({ googleId: profile.id });

    if (!user) {
      // If not found, try to find by email
      user = await User.findOne({ email: profile.emails[0].value });
      if (user) {
        // Link Google account to existing user
        user.googleId = profile.id;
        user.profilePic = profile.photos[0].value; // Optionally update
        await user.save();
      } else
        // Create new user
        user = await User.create({
          googleId: profile.id,
          email: profile.emails[0].value,
          username: profile.displayName,
          profilePic: profile.photos[0].value,
          accountStatus: "active",
        });
    }

    return user;
  } catch (error) {
    console.error("Google Strategy Error:", error);
    throw error;
  }
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
  async (accessToken, refershToken, profile, done) => {
    try {
      const user = await findOrCreateUser(profile);
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  },
);

module.exports = GoogleProvider;
