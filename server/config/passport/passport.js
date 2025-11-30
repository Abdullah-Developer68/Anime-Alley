const passport = require("passport");
const GoogleProvider = require("./Strategies/GoogleStrategy.js");

// Use Google OAuth strategy
passport.use(GoogleProvider);

module.exports = passport;
