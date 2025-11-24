// src/modules/user/user.model.js
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import {
  accessTokenExpires,
  accessTokenSecrete,
  refreshTokenExpires,
  refreshTokenSecrete,
} from '../../config/config.js';

const UserSchema = new mongoose.Schema(
  {

      fullName: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      username: { type: String },
      phone: {type: String},
      dob: { type: Date, default: null },
      gender: {
        type: String,
        enum: ['male', 'female', 'other'],
        default: 'male'
      },

      role: {
        type: String,
        default: "USER",
        enum: ['user', 'admin', 'organizer'],
      },
      clubName:{
        type:String,
        default: null
      },
      handicap:{
        type:String,
        default: null
      },
      stripeAccountId: { type: String, default: null },

      bio: { type: String, default: '' },
      address: { type: AddressSchema, default: () => ({}) },

      profileImage: { type: String, default: '' },
      multiProfileImage: { type: [String], default: [] },
      pdfFile: { type: String, default: '' },
      about: {
      type: String,
      default: 'Hey there! I am using WhatsApp'
    },
    isOnline: {
      type: Boolean,
      default: false
    },
    lastSeen: {
      type: Date,
      default: Date.now
    },
    contacts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    blockedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],

    otp: {

      type: String,
      enum: ['male', 'female', 'other'],
      default: 'male',
    },
    clubName: { type: String, default: '' },
    handicap: { type: String, default: '' },
    whsNumber: { type: String, default: '' },

    // PROFILE IMAGE
    profileImage: { type: String, default: '' },

    // Auth / verification helpers (used by auth module)
    otp: { type: String, default: null },
    otpExpires: { type: Date, default: null },
    otpVerified: { type: Boolean, default: false },
    resetExpires: { type: Date, default: null },
    isVerified: { type: Boolean, default: true },

    // Role & tokens
    role: {
      type: String,
      enum: ['user', 'admin', 'organizer'],
      default: 'user',
    },
    refreshToken: { type: String, default: '' },
  },
  { timestamps: true }
);

// Hash password before save
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password (used in change-password flow)
UserSchema.methods.comparePassword = async function (id, plainPassword) {
  const user = await this.model('User').findById(id).select('password');
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

const User = mongoose.models.User || mongoose.model('User', UserSchema);
export default User;
