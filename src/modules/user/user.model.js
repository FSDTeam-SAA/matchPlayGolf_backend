// src/modules/user/user.model.js
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import {
  accessTokenExpires,
  accessTokenSecrete,
  refreshTokenExpires,
  refreshTokenSecrete,
} from "../../config/config.js";

const UserSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email:    { type: String, required: true, unique: true },
    password: { type: String, select:false },


    username: { type: String },
    phone:    { type: String },
    

    organizationName: { type: String, default: "" },

    dob: { type: Date, default: null },

    gender: {
      type: String,
      enum: ["male", "female", "other"],
      default: "male",
    },

    // FIXED ROLE ENUM
    role: {
      type: String,
      enum: ["User", "Admin", "Organizer"],
      default: "User",
    },

    clubName:  { type: String, default: "" },
    country:   { type: String, default: "" },
    handicap:  { type: String, default: "4.5" },
    whsNumber: { type: String, default: "" },

    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    stripeAccountId: { type: String, default: null },

    bio:   { type: String, default: "" },
    about: { type: String, default: "Hey there! I am using WhatsApp" },
    color: { type: String, default: "" },

    newsletterPreference: {
      type: String,
      enum: ["subscribe", "unsubscribe", "none"],
      default: "none",
    },
    receiveOrderUpdates: { type: Boolean, default: false },
    status:             { type: String, default: "active" },
    profileImage:      { type: String, default: "" },
    organizerLogo:     { type: String, default: "" },
    sportNationalId:   { type: String, default: "" },
    multiProfileImage: { type: [String], default: [] },
    pdfFile:           { type: String, default: "" },

    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },

    contacts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    otp:         { type: String, default: null },
    otpExpires:  { type: Date, default: null },
    otpVerified: { type: Boolean, default: false },
    resetExpires:{ type: Date, default: null },
    isVerified:  { type: Boolean, default: true },

    refreshToken: { type: String, default: "" },
    verifyToken:  { type: String, default: "" },
  },
  { timestamps: true }
);

// Hash password
// UserSchema.pre("save", async function (next) {
//   if (!this.isModified("password")) return next();
//   this.password = await bcrypt.hash(this.password, 10);
//   next();
// });
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 10);
  next();
});


// Compare password
UserSchema.methods.comparePassword = async function (id, plainPassword) {
  const user = await this.model("User").findById(id).select("password");
  if (!user) return false;
  return bcrypt.compare(plainPassword, user.password);
};

// Generate access token
UserSchema.methods.generateAccessToken = function (payload) {
  return jwt.sign(payload, accessTokenSecrete, {
    expiresIn: accessTokenExpires,
  });
};

// Generate refresh token
UserSchema.methods.generateRefreshToken = function (payload) {
  return jwt.sign(payload, refreshTokenSecrete, {
    expiresIn: refreshTokenExpires,
  });
};

const User = mongoose.models.User || mongoose.model("User", UserSchema);
export default User;
