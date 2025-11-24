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
    // Core identity
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    // PERSONAL INFORMATION (matches red UI section)
    phone: { type: String, default: '' },
    gender: {
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
