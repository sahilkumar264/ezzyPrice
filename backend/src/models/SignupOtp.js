const mongoose = require("mongoose");

const SignupOtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
    lastSentAt: {
      type: Date,
      default: Date.now,
    },
    attemptCount: {
      type: Number,
      default: 0,
    },
    resendCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const SignupOtp = mongoose.model("SignupOtp", SignupOtpSchema);

module.exports = SignupOtp;
