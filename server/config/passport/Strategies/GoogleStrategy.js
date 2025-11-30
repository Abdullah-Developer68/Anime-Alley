const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../../../models/user.model");
const dotenv = require("dotenv");
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
      } else {
        // Create new user
        user = await User.create({
          googleId: profile.id,
          email: profile.emails[0].value,
          username: profile.displayName,
          profilePic: profile.photos[0].value,
        });
      }
    }

    return user;
  } catch (error) {
    console.error("Google Strategy Error:", error);
    throw error;
  }
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
  },
  async (accessToken, refershToken, profile, done) => {
    try {
      const user = await findOrCreateUser(profile);
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
);

module.exports = GoogleProvider;
