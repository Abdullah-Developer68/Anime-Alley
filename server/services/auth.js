const userModel = require("../models/user.model.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const sendOTP = require("../utils/sendOTP.js");
const dbConnect = require("../config/dbConnect.js");
const otpData = require("../utils/otpGenerator.js");
const createTemporaryPasswordHash = require("../utils/tempPasswordHash.js");

dotenv.config();

const secretKey = process.env.JWT_KEY;

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

// Centralized cookie configuration for consistent JWT-only auth
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

// Separate function for clearing cookies to avoid maxAge conflicts
const getClearCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    maxAge: 0, // Immediately expire
    // ...(isProduction &&
    //   process.env.COOKIE_DOMAIN && {
    //     domain: process.env.COOKIE_DOMAIN,
    //   }),
  };
};

const sendSignupOtp = async (req, res) => {
  try {
    await dbConnect();
    const { email } = req.body;

    let otp;
    let otpExpiry;
    let msg = "";
    let newUser = false;

    let user = await userModel.findOne({ email });

    // create user if not found
    if (!user) {
      msg = "OTP sent to your email! Please use that to Sign In!";
      otp = otpData().otp;
      otpExpiry = otpData().otpExpiry;

      // create a temporary password, so until user provides his own and bcrypt
      // encrypts it during that time his account is safe. After signup we will replace it
      const tempPasswordHash = await createTemporaryPasswordHash();

      // Create new user with verifying status and required fields
      user = await userModel.create({
        email,
        otp,
        otpExpiry,
        accountStatus: "verifying",
        username: "temp",
        password: tempPasswordHash,
      });

      newUser = true;
    }

    if (user.accountStatus === "verifying" && user.otpExpiry > new Date() && !newUser) {
      return res
        .status(200)
        .json({ message: "OTP already sent! Please use that to Sign In!" });
    } else if (
      user.accountStatus === "verifying" &&
      user.otpExpiry < new Date()
    ) {
      msg = "OTP expired! Generating new OTP and sending it to your email!";

      // generates a new otp
      otp = otpData().otp;
      otpExpiry = otpData().otpExpiry;

      // updates the existing user with the new otp and expiry
      user.otp = otp;
      user.otpExpiry = otpExpiry;
      await user.save();
    } else if (user.accountStatus === "active") {
      return res
        .status(200)
        .json({ message: "You already have an account, so please Sign In" });
    } else {
      // if the user is signing up for the first time this runs
      msg = "OTP sent to your email! Please use that to Sign In!";
      // generates a new otp
      otp = otpData().otp;
      otpExpiry = otpData().otpExpiry;
      user.otp = otp;
      user.otpExpiry = otpExpiry;
      user.accountStatus = "verifying";
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
    await dbConnect();
    const { email, otp } = req.body;
    const user = await userModel.findOne({ email, accountStatus: "verifying" });
    if (
      !user ||
      user.otp.toString() !== otp.toString() ||
      user.otpExpiry < new Date()
    ) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    res
      .status(200)
      .json({ message: "OTP verified", accountStatus: user.accountStatus });
  } catch (err) {
    console.error("OTP Verification Error:", err.message);
    return res.status(500).json({
      success: false,
      message: err.message || "OTP verification failed",
    });
  }
};

const signUp = async (req, res) => {
  await dbConnect();
  try {
    const { email, password, username } = req.body;
    // Find user with accountStatus verifying
    const user = await userModel.findOne({ email, accountStatus: "verifying" });
    if (user?.accountStatus !== "verifying") {
      return res.status(400).json({
        success: false,
        message: "There is no pending verification. Please start signup again.",
      });
    }
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    // Update user fields and set role to user
    user.username = username;
    user.password = hashedPassword;
    user.role = "user";
    user.otp = undefined;
    user.otpExpiry = undefined;
    user.accountStatus = "active";
    await user.save();
    // Create token and sign in
    const token = jwt.sign(
      {
        userid: user._id,
        email: user.email,
        username: user.username,
        profilePic: user.profilePic,
        role: user.role,
      },
      secretKey,
      { expiresIn: "7d" },
    );

    // Set cookie as fallback (for compatibility)
    res.cookie("token", token, getCookieOptions());

    // Send token in response body for localStorage storage
    res.status(201).json({
      success: true,
      token, // Include token in response for localStorage
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profilePic: user.profilePic,
        role: user.role,
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
  await dbConnect();
  try {
    const { email, password } = req.body;

    // Check if credentials are provided
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        status: false,
        message: "Email and password are required for login!",
      });
    }

    // Check if user exists
    const userExist = await userModel.findOne({ email });

    if (!userExist) {
      return res
        .status(401)
        .json({ success: false, status: false, message: "User not found!" });
    }

    if (userExist.accountStatus === "verifying") {
      return res.status(403).json({
        success: false,
        status: false,
        message:
          "Your account is still verifying. Please complete OTP verification first.",
      });
    }

    // Check if user was registered through Google (no password but has googleId)
    if (
      (!userExist.password || userExist.password === "N/A") &&
      userExist.googleId
    ) {
      return res.status(400).json({
        success: false,
        status: false,
        message:
          "You are registered through Google. Please use Google login to sign in.",
      });
    }

    const passwordMatch = await bcrypt.compare(password, userExist.password);
    if (!passwordMatch) {
      return res.status(401).json({
        status: false,
        message: "Either email or password is incorrect!",
      });
    }

    // Create token and send as cookie
    const token = jwt.sign(
      {
        userid: userExist._id,
        email: userExist.email,
        username: userExist.username,
        profilePic: userExist.profilePic,
        role: userExist.role,
      },
      secretKey,
      { expiresIn: "7d" },
    );

    // Set cookie as fallback (for compatibility)
    res.cookie("token", token, getCookieOptions());

    const user = {
      id: userExist._id,
      username: userExist.username,
      email: userExist.email,
      role: userExist.role,
      profilePic: userExist.profilePic,
    };

    // Send login success response with token for localStorage
    res.status(200).json({
      success: true,
      token, // Include token in response for localStorage
      user,
      message: "You have been logged in!",
    });
  } catch (error) {
    console.error("Login Error:", error.message);
    res.status(500).json({ message: "Unauthorized!" });
  }
};

const logout = async (req, res) => {
  await dbConnect();
  try {
    // Clear JWT cookie (works for both local and Google auth)
    res.cookie("token", "", getClearCookieOptions()); // Use dedicated clear cookie options

    // because the browser was constantly caching the logout function
    // the cookie never got cleared and because of that the token from
    // the client side was never deleted and after every refresh the user
    // was being logged back in. Making every request unique solved this issue
    // but in the req header we can also tell the browser to not cache this request
    res.status(200).json({
      success: true,
      message: "Logged out successfully",
      timestamp: Date.now(), // Makes each response unique so that the browser doesn't cache it
    });
  } catch (error) {
    console.error("Logout Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};

//  helps to stay logged in even after refreshing the page
const verifyToken = async (req, res) => {
  await dbConnect();
  try {
    // Use utility function to extract token from Authorization header or cookies
    const token = extractToken(req);
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "No authentication token found" });
    }

    const decoded = jwt.verify(token, secretKey);

    res.json({
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

    // Handle specific JWT errors
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Authentication token expired.",
      });
    }

    res
      .status(401)
      .json({ success: false, message: "Token verification failed" });
  }
};

module.exports = {
  sendSignupOtp,
  verifyOTP,
  signUp,
  login,
  logout,
  verifyToken,
};
