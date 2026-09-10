const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },

    // `email` is unique, meaning no two users can have the same email address
    email: { type: String, unique: true, required: true },

    role: {
      type: String,
      enum: ["superAdmin", "admin", "user"],
      default: "user",
    },

    accountStatus: {
      type: String,
      enum: ["verifying", "active"],
      default: "verifying",
    },
    isOtpVerified: {
      type: Boolean,
      default: false,
    },
    isDemo: {
      type: Boolean,
      default: false,
    },
    // sent for verification of email via normal signup
    otp: {
      type: String,
      required: function () {
        // Required only if not Google and the account is still verifying
        return !this.googleId && this.accountStatus === "verifying";
      },
    },
    otpExpiry: {
      type: Date,
      required: function () {
        return !this.googleId && this.accountStatus === "verifying";
      },
    },
    password: {
      type: String,
      required: function () {
        //this keyword refers to the current document being validated
        return !this.googleId;
      },
    },

    profilePic: { type: String },
    profilePicPublicId: { type: String },

    // `googleId` is unique, ensuring no two users can have the same Google ID
    // `sparse: true` allows users who sign up without Google OAuth to omit this field (it's only enforced for Google users)
    googleId: { type: String, unique: true, sparse: true },
    couponCodeUsed: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "coupons",
        default: [],
      },
    ],
    orders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "orders",
      },
    ],
  },

  { timestamps: true }, //Automatically add createdAt & updatedAt
);

// Adds index on searchable fields
userSchema.index(
  {
    username: "text",
    email: "text",
  },
  {
    weights: { username: 5, email: 4 },
    name: "UserSearchIndex",
  },
);

const User = mongoose.model("users", userSchema);

module.exports = User;
