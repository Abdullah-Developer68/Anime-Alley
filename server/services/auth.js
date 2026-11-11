const userModel = require("../db/models/user.model.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const crypto = require("crypto");
const sendOTP = require("../utils/sendOTP.js");
const dbConnect = require("../db/dbConnect.js");
const { otpData, hashOtp, otpMatches, MAX_OTP_ATTEMPTS } = require("../utils/otpGenerator.js");
const createTemporaryPasswordHash = require("../utils/tempPasswordHash.js");
const {
  isNonEmptyString,
  normalizeEmail,
  isValidEmail,
  passwordProblem,
  usernameProblem,
} = require("../utils/validation.utils.js");
const { keyFor } = require("../utils/tokenKeys.utils.js");
const { createSession, refreshSession, revokeSession } = require("../utils/authSession.utils.js");

dotenv.config();

// Same reply whether the email is new, mid-signup or already registered (no account enumeration)
const OTP_SENT_MESSAGE =
  "If this email can be used to sign up, a code is on its way. Already have an account? Log in instead.";

// Compared against when there is no usable password, so failed logins all take as long as a real check
let dummyPasswordHash;
const getDummyPasswordHash = async () =>
  (dummyPasswordHash ??= await bcrypt.hash(crypto.randomBytes(16).toString("hex"), 10));

// Accounts created before emails were stored lower-case keep their original case until they log in.
// Mongoose lower-cases query values, so this exact-case lookup goes to the driver directly.
const findLegacyMixedCaseUser = async (rawEmail, email) => {
  if (rawEmail === email)
    return null;
  const legacy = await userModel.collection.findOne({ email: rawEmail }, { projection: { _id: 1 } });
  if (!legacy)
    return null;
  // Fix the stored case now; fails harmlessly if a lower-case twin account already exists
  await userModel.updateOne({ _id: legacy._id }, { email }).catch(() => {});
  return userModel.findById(legacy._id);
};

const sendSignupOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);

    if (!isValidEmail(email))
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address",
      });

    await dbConnect();

    const { otp, otpExpiry } = otpData();
    // A new code always starts with a clean attempt count
    const otpFields = { otp: hashOtp(email, otp), otpExpiry, otpAttempts: 0, isOtpVerified: false };

    const user = await userModel.findOne({ email });

    if (!user) {
      // create a temporary password, so until user provides his own and bcrypt
      // encrypts it during that time his account is safe. After signup we will replace it
      const tempPasswordHash = await createTemporaryPasswordHash();

      await userModel.create({
        email,
        ...otpFields,
        accountStatus: "verifying",
        username: "temp",
        password: tempPasswordHash,
      });
    } else if (user.accountStatus === "active")
      return res.status(200).json({ message: OTP_SENT_MESSAGE });
    else if (user.otpExpiry > new Date()) {
      // No new code until the current one expires, including after it was locked by wrong guesses
      user.isOtpVerified = false;
      await user.save();
      return res.status(200).json({ message: OTP_SENT_MESSAGE });
    } else {
      Object.assign(user, otpFields);
      await user.save();
    }
    await sendOTP(email, otp);
    res.status(200).json({ message: OTP_SENT_MESSAGE });
  } catch (err) {
    console.error("OTP Generation Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "OTP generation failed",
    });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body || {};
    const email = normalizeEmail(req.body?.email);

    if (!email || !isNonEmptyString(otp))
      return res
        .status(400)
        .json({ success: false, message: "Email and OTP are required" });

    await dbConnect();

    // Count the attempt before checking the code, so parallel guesses can't slip past the limit.
    // `$not` also matches accounts created before otpAttempts existed.
    const user = await userModel.findOneAndUpdate(
      { email, accountStatus: "verifying", otpAttempts: { $not: { $gte: MAX_OTP_ATTEMPTS } } },
      { $inc: { otpAttempts: 1 } },
      { new: true },
    );

    if (!user) {
      const locked = await userModel.exists({
        email,
        accountStatus: "verifying",
        otpAttempts: { $gte: MAX_OTP_ATTEMPTS },
        otpExpiry: { $gt: new Date() },
      });
      if (locked)
        return res.status(429).json({
          success: false,
          message: "Too many incorrect codes. Request a new code after 5 minutes.",
        });
    }

    if (!user || user.otpExpiry < new Date() || !otpMatches(user.email, otp, user.otp))
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired OTP" });

    // Mark user as having verified OTP in database
    user.isOtpVerified = true;
    await user.save();

    // Signed with its own key, so it can't be used as a login token
    const verificationToken = jwt.sign(
      { email: user.email, purpose: "otp_verification" },
      keyFor("signup-verification"),
      { algorithm: "HS256", expiresIn: "15m" },
    );

    res.status(200).json({
      success: true,
      message: "OTP verified",
      verificationToken,
      accountStatus: user.accountStatus,
    });
  } catch (err) {
    console.error("OTP Verification Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "OTP verification failed",
    });
  }
};

const signUp = async (req, res) => {
  try {
    const { password, username, verificationToken } = req.body || {};
    const email = normalizeEmail(req.body?.email);

    if (!email || !isNonEmptyString(password) || !isNonEmptyString(username))
      return res.status(400).json({
        success: false,
        message: "Email, password, and username are required!",
      });

    const invalid = usernameProblem(username) || passwordProblem(password);
    if (invalid)
      return res.status(400).json({ success: false, message: invalid });

    // Strict check: verificationToken must be present
    if (!isNonEmptyString(verificationToken))
      return res.status(400).json({
        success: false,
        message: "OTP verification is required before signup. Verification token missing.",
      });

    // Verify token signature and purpose
    try {
      const decoded = jwt.verify(verificationToken, keyFor("signup-verification"), {
        algorithms: ["HS256"],
      });
      if (decoded.email !== email || decoded.purpose !== "otp_verification")
        return res.status(400).json({
          success: false,
          message: "Invalid verification token. Please verify OTP again.",
        });
    } catch (tokenErr) {
      return res.status(400).json({
        success: false,
        message: "Verification token expired or invalid. Please verify OTP again.",
      });
    }

    await dbConnect();

    // Find user with accountStatus verifying
    const user = await userModel.findOne({ email, accountStatus: "verifying" });
    if (!user)
      return res.status(400).json({
        success: false,
        message: "There is no pending verification. Please start signup again.",
      });

    // Strict check: database flag isOtpVerified must be true
    if (!user.isOtpVerified)
      return res.status(400).json({
        success: false,
        message: "OTP has not been verified. Please complete OTP verification first.",
      });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    // Update user fields and set role to user
    user.username = username.trim();
    user.password = hashedPassword;
    user.role = "user";
    user.otp = undefined;
    user.otpExpiry = undefined;
    user.otpAttempts = undefined;
    user.isOtpVerified = false;
    user.accountStatus = "active";
    await user.save();
    const { token, refreshToken } = await createSession(user._id);

    res.status(201).json({
      success: true,
      token,
      refreshToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profilePic: user.profilePic,
        role: user.role,
        isDemo: false,
      },
    });
  } catch (error) {
    console.error("Registration Error:", error.message);
    res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

const login = async (req, res) => {
  try {
    const { password } = req.body || {};
    const rawEmail = typeof req.body?.email === "string" ? req.body.email.trim() : "";
    const email = normalizeEmail(rawEmail);

    // Check if credentials are provided
    if (!email || !isNonEmptyString(password))
      return res.status(400).json({
        success: false,
        status: false,
        message: "Email and password are required for login!",
      });

    await dbConnect();

    const userExist = (await userModel.findOne({ email })) || (await findLegacyMixedCaseUser(rawEmail, email));

    // One answer for every failure (no account, signup not finished, Google-only, wrong password),
    // and bcrypt always runs, so neither the message nor the timing shows whether the email exists
    const canUsePassword =
      userExist?.accountStatus === "active" && !!userExist.password && userExist.password !== "N/A";
    const passwordMatch = await bcrypt.compare(
      password,
      canUsePassword ? userExist.password : await getDummyPasswordHash(),
    );
    if (!canUsePassword || !passwordMatch)
      return res.status(401).json({
        success: false,
        status: false,
        message: "Invalid email or password. If you signed up with Google, use the Google button.",
      });

    // The client sends the access token as a Bearer header and renews it with the refresh token
    const { token, refreshToken } = await createSession(userExist._id);

    const user = {
      id: userExist._id,
      username: userExist.username,
      email: userExist.email,
      role: userExist.role,
      profilePic: userExist.profilePic,
      isDemo: userExist.isDemo || false,
    };

    res.status(200).json({
      success: true,
      token,
      refreshToken,
      user,
      message: "You have been logged in!",
    });
  } catch (error) {
    console.error("Login Error:", error.message);
    res.status(500).json({ message: "Unauthorized!" });
  }
};

// POST /auth/logout { refreshToken }: deletes this device's session, which also kills its access token
const logout = async (req, res) => {
  const refreshToken = req.body?.refreshToken;
  // Nothing to revoke; logging out is idempotent
  if (!isNonEmptyString(refreshToken))
    return res.status(200).json({ success: true, message: "Logged out successfully" });

  try {
    await dbConnect();
    await revokeSession(refreshToken);
    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};

// POST /auth/refresh { refreshToken }: issues a new 15-minute access token
const refreshAccessToken = async (req, res) => {
  const refreshToken = req.body?.refreshToken;
  if (!isNonEmptyString(refreshToken))
    return res.status(400).json({ success: false, message: "Refresh token is required" });

  try {
    await dbConnect();
    const refreshed = await refreshSession(refreshToken);
    const userActive =
      refreshed && (await userModel.exists({ _id: refreshed.userId, accountStatus: "active" }));
    if (!userActive) {
      if (refreshed)
        await revokeSession(refreshToken);
      return res.status(401).json({ success: false, message: "Session expired. Please log in again." });
    }

    // refreshToken is missing when another tab rotated it a moment ago and already stored the new one
    res.status(200).json({ success: true, token: refreshed.token, refreshToken: refreshed.refreshToken });
  } catch (error) {
    console.error("Token refresh error:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET /auth/me: runs after verifyTokenMiddleware, so req.user is fresh from the database
const getCurrentUser = (req, res) => {
  const { id, username, email, profilePic, role, isDemo } = req.user || {};
  res.status(200).json({
    success: true,
    user: { id, username, email, profilePic, role, isDemo },
  });
};

const DEMO_NAME_PREFIX = { admin: "demoAdmin", user: "demoUser" };

// Demo accounts get a random suffix, so creating one never depends on (or scans) existing usernames
const demoLogin = async (req, res) => {
  try {
    const role = req.body?.role === "admin" ? "admin" : "user";

    await dbConnect();

    let user = null;
    for (let attempt = 0; attempt < 5 && !user; attempt++) {
      const username = `${DEMO_NAME_PREFIX[role]}-${crypto.randomBytes(3).toString("hex")}`;
      // ".invalid" is a reserved domain, so no email can ever reach a real mailbox
      const email = `${username.toLowerCase()}@demo.invalid`;
      user = await userModel
        .create({
          username,
          email,
          password: await createTemporaryPasswordHash(),
          role,
          accountStatus: "active",
          isDemo: true,
          profilePic: "",
        })
        .catch((error) => {
          if (error?.code === 11000)
            return null;
          throw error;
        });
    }

    if (!user)
      return res.status(500).json({ success: false, message: "Could not create a demo account. Please try again." });

    const { token, refreshToken } = await createSession(user._id);

    return res.status(201).json({
      success: true,
      token,
      refreshToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profilePic: "",
        isDemo: true,
      },
      message: `Demo ${role === "admin" ? "Admin" : "User"} account created!`,
    });
  } catch (error) {
    console.error("Demo login error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while creating demo account.",
    });
  }
};

module.exports = {
  sendSignupOtp,
  verifyOTP,
  signUp,
  login,
  logout,
  refreshAccessToken,
  getCurrentUser,
  demoLogin,
};
