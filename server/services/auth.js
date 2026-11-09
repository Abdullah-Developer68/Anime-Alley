const userModel = require("../db/models/user.model.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const crypto = require("crypto");
const sendOTP = require("../utils/sendOTP.js");
const dbConnect = require("../db/dbConnect.js");
const { otpData, hashOtp, otpMatches, MAX_OTP_ATTEMPTS } = require("../utils/otpGenerator.js");
const createTemporaryPasswordHash = require("../utils/tempPasswordHash.js");
const { isNonEmptyString } = require("../utils/validation.utils.js");
const { keyFor } = require("../utils/tokenKeys.utils.js");
const { createSession, refreshSession, revokeSession } = require("../utils/authSession.utils.js");

dotenv.config();

const sendSignupOtp = async (req, res) => {
  try {
    const email = req.body?.email;

    if (!isNonEmptyString(email))
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });

    await dbConnect();

    let msg = "OTP sent to your email! Please use that to Sign In!";
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
      return res
        .status(200)
        .json({ message: "You already have an account, so please Sign In" });
    else if (user.otpExpiry > new Date()) {
      // No new code until the current one expires, including after it was locked by wrong guesses
      user.isOtpVerified = false;
      await user.save();
      return res
        .status(200)
        .json({ message: "OTP already sent! Please use that to Sign In!" });
    } else {
      msg = "OTP expired! Generating new OTP and sending it to your email!";
      Object.assign(user, otpFields);
      await user.save();
    }
    await sendOTP(email, otp);
    res.status(200).json({ message: msg });
  } catch (err) {
    console.error("OTP Generation Error:", err.message);
    return res.status(500).json({
      success: false,
      message: err.message || "OTP generation failed",
    });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body || {};

    if (!isNonEmptyString(email) || !isNonEmptyString(otp))
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
      message: err.message || "OTP verification failed",
    });
  }
};

const signUp = async (req, res) => {
  try {
    const { email, password, username, verificationToken } = req.body || {};

    if (!isNonEmptyString(email) || !isNonEmptyString(password) || !isNonEmptyString(username))
      return res.status(400).json({
        success: false,
        message: "Email, password, and username are required!",
      });

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
    user.username = username;
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
      error: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    // Check if credentials are provided
    if (!isNonEmptyString(email) || !isNonEmptyString(password))
      return res.status(400).json({
        success: false,
        status: false,
        message: "Email and password are required for login!",
      });

    await dbConnect();

    // Check if user exists
    const userExist = await userModel.findOne({ email });

    if (!userExist)
      return res
        .status(401)
        .json({ success: false, status: false, message: "User not found!" });

    if (userExist.accountStatus === "verifying")
      return res.status(403).json({
        success: false,
        status: false,
        message:
          "Your account is still verifying. Please complete OTP verification first.",
      });

    // Check if user was registered through Google (no password but has googleId)
    if (
      (!userExist.password || userExist.password === "N/A") &&
      userExist.googleId
    )
      return res.status(400).json({
        success: false,
        status: false,
        message:
          "You are registered through Google. Please use Google login to sign in.",
      });

    const passwordMatch = await bcrypt.compare(password, userExist.password);
    if (!passwordMatch)
      return res.status(401).json({
        status: false,
        message: "Either email or password is incorrect!",
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

    res.status(200).json({ success: true, token: refreshed.token });
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

const demoLogin = async (req, res) => {
  try {
    const requestedRole =
      req.body?.role === "admin" ? "admin" : "user";
    const base = requestedRole === "admin" ? "demoAdmin" : "demoUser";

    await dbConnect();

    // Find existing users with this base pattern to determine the next sequence number
    const regex = new RegExp(`^${base}(\\d*)$`, "i");
    const existingUsers = await userModel
      .find({ username: regex })
      .select("username email");

    let maxNum = 0;
    for (const u of existingUsers) {
      const match = u.username.match(regex);
      if (match) {
        const num = match[1] ? parseInt(match[1], 10) : 0;
        if (!isNaN(num) && num > maxNum)
          maxNum = num;
      }
    }

    let nextNum = maxNum + 1;
    let username = `${base}${nextNum}`;
    let email = `${username.toLowerCase()}@demo.com`;

    let user = null;
    let attempts = 0;
    const maxAttempts = 10;

    while (!user && attempts < maxAttempts) {
      attempts++;
      // Ensure uniqueness in case of race condition or gaps
      while (
        await userModel.exists({
          $or: [{ username }, { email }],
        })
      ) {
        nextNum++;
        username = `${base}${nextNum}`;
        email = `${username.toLowerCase()}@demo.com`;
      }

      // Generate random password and hash it
      const randomPassword = crypto.randomBytes(16).toString("hex");
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      try {
        user = await userModel.create({
          username,
          email,
          password: hashedPassword,
          role: requestedRole,
          accountStatus: "active",
          isDemo: true,
          profilePic: "",
        });
      } catch (createErr) {
        // Retry on duplicate key race conditions (code 11000)
        if (
          createErr.code === 11000 ||
          /duplicate key/i.test(createErr.message)
        ) {
          nextNum++;
          username = `${base}${nextNum}`;
          email = `${username.toLowerCase()}@demo.com`;
          user = null;
        } else {
          throw createErr;
        }
      }
    }

    if (!user)
      return res.status(500).json({
        success: false,
        message:
          "Failed to allocate unique demo account sequence after multiple attempts.",
      });

    const { token, refreshToken } = await createSession(user._id);

    const userData = {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      profilePic: user.profilePic || "",
      isDemo: true,
    };

    return res.status(201).json({
      success: true,
      token,
      refreshToken,
      user: userData,
      message: `Demo ${requestedRole === "admin" ? "Admin" : "User"} account created!`,
    });
  } catch (error) {
    console.error("Demo login error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while creating demo account.",
      error: error.message,
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
