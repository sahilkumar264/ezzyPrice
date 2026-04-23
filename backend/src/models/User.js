const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      default: "",
    },
    googleId: {
      type: String,
      default: "",
      index: true,
    },
    avatarUrl: {
      type: String,
      default: "",
    },
    authProvider: {
      type: String,
      enum: ["local", "google", "hybrid"],
      default: "local",
    },
    role: {
      type: String,
      enum: ["user"],
      default: "user",
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

UserSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: String(this._id),
    name: this.name,
    email: this.email,
    avatarUrl: this.avatarUrl || "",
    authProvider: this.authProvider,
    role: this.role,
    createdAt: this.createdAt,
  };
};

const User = mongoose.model("User", UserSchema);

module.exports = User;
