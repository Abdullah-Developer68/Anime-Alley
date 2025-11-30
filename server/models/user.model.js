const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },

    // `email` is unique, meaning no two users can have the same email address
    email: { type: String, unique: true, required: true },

    role: {
      type: String,
      enum: ["superAdmin", "admin", "user", "verifying"],
      default: "user",
    },
    // sent for verification of email via normal signup
    otp: {
      type: String,
      required: function () {
        // Required only if not Google and role is 'verifying'
        return !this.googleId && this.role === "verifying";
      },
    },
    otpExpiry: {
      type: Date,
      required: function () {
        return !this.googleId && this.role === "verifying";
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

  { timestamps: true } //Automatically add createdAt & updatedAt
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
  }
);

const User = mongoose.model("users", userSchema);

module.exports = User;
