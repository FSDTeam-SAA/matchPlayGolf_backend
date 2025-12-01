import User from '../user/user.model.js';
import RegisterUser from '../others/tournamentPlayer.model.js';
import jwt from 'jsonwebtoken';
import { emailExpires } from '../../config/config.js';
import sendEmail from '../../lib/sendEmail.js';
import { verificationCodeTemplate } from '../../lib/emailTemplates.js';
import dotenv from 'dotenv';
dotenv.config();


/**
 * Register a single user
 */
export const registerUserService = async ({
  fullName,
  email,
  password,
  phone,
  clubName,
  handicap,
  role,
  organizationName,
  color,
  dob,
  newsletterPreference,
  receiveOrderUpdates,
  tournamentId,
  createdBy
}) => {
  // Check existing user by email OR phone
  const existingUser = await User.findOne({
    $or: [{ email }, { phone }]
  });

  if (existingUser) {
    // If tournament registration requested, add to tournament
    let added = null;
    if (tournamentId) {
      // Check if already registered in tournament
      const alreadyRegistered = await RegisterUser.findOne({
        tournamentId,
        userId: existingUser._id
      });

      if (!alreadyRegistered) {
        added = await new RegisterUser({
          tournamentId,
          userId: existingUser._id,
          createdBy
        }).save();
      } else {
        added = alreadyRegistered;
      }
    }

    return {
      _id: existingUser._id,
      fullName: existingUser.fullName,
      email: existingUser.email,
      profileImage: existingUser.profileImage,
      color: existingUser.color,
      dob: existingUser.dob,
      newsletterPreference: existingUser.newsletterPreference,
      receiveOrderUpdates: existingUser.receiveOrderUpdates,
      isExisting: true,
      added
    };
  }

  // Create new user
  const newUser = new User({
    fullName,
    email,
    password: password || null,
    phone,
    clubName,
    handicap,
    role: role || "User",
    organizationName,
    color,
    dob,
    newsletterPreference,
    receiveOrderUpdates
  });

  const user = await newUser.save();

  /** Send Set Password Email if no password provided */
  if (!password) {
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const setupUrl = `${process.env.CLIENT_URL}/set-password?token=${token}`;

    await sendEmail({
      to: email,
      subject: "Set Your Password",
      html: `
        <p>Hello ${fullName},</p>
        <p>Your account has been created. Click below to set your password:</p>
        <a href="${setupUrl}" target="_blank">Set Password</a>
        <p>This link expires in 1 hour.</p>
      `
    });
  }

  /** Add user to tournament */
  let added = null;
  if (tournamentId) {
    added = await new RegisterUser({
      tournamentId,
      userId: user._id,
      createdBy
    }).save();
  }

  return {
    _id: user._id,
    fullName,
    email,
    profileImage: user.profileImage,
    color: user.color,
    dob: user.dob,
    newsletterPreference: user.newsletterPreference,
    receiveOrderUpdates: user.receiveOrderUpdates,
    isExisting: false,
    added
  };
};

/** -----------------------------------------------------
 *  Multiple user import (bulk)
 * ----------------------------------------------------- */
/**
 * Import multiple users (bulk)
 */
export const importMultipleUsersService = async (users, tournamentId, createdBy) => {
  const results = [];

  for (const u of users) {
    try {
      const {
        fullName,
        email,
        phone,
        clubName,
        handicap,
        organizationName,
        color,
        dob,
        newsletterPreference,
        receiveOrderUpdates,
      } = u;

      // Validate required fields
      if (!fullName || !email || !phone) {
        results.push({
          email,
          status: "failed",
          error: "fullName, email & phone are required"
        });
        continue;
      }

      // Register or update user
      const createdUser = await registerUserService({
        fullName,
        email,
        phone,
        clubName,
        handicap,
        organizationName,
        color,
        dob,
        newsletterPreference,
        receiveOrderUpdates,
        password: null,
        tournamentId,
        createdBy
      });

      results.push({
        email,
        status: createdUser.isExisting ? "updated" : "created",
        user: createdUser
      });

    } catch (err) {
      results.push({
        email: u.email,
        status: "failed",
        error: err.message
      });
    }
  }

  return results;
};

/** -----------------------------------------------------
 * Set new password after token verification
 * ----------------------------------------------------- */
export const setPasswordService = async ({ token, password }) => {
  if (!token || !password)
    throw new Error("Token and password are required");

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw new Error("Invalid or expired token");
  }

  const user = await User.findById(decoded.userId);
  if (!user) throw new Error("User not found");

  user.password = password;
  await user.save();

  return { message: "Password set successfully" };
};

export const loginUserService = async ({ email, password }) => {
  if (!email || !password) throw new Error('Email and password are required');

  const user = await User.findOne({ email }).select("_id fullName email role profileImage color dob newsletterPreference receiveOrderUpdates");

  if (!user) throw new Error('User not found');

  const isMatch = await user.comparePassword(user._id, password);
  if (!isMatch) throw new Error('Invalid password');

  const payload = { _id: user._id, role: user.role };


    const accessToken = user.generateAccessToken(payload);
    const refreshToken = user.generateRefreshToken(payload);


    return {
    accessToken,
    refreshToken,
    user: {
      _id: user._id,
      fullName: user.fullName,  
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
      color: user.color,
      dob: user.dob,
      newsletterPreference: user.newsletterPreference,
      receiveOrderUpdates: user.receiveOrderUpdates
    }
  };
};



export const refreshAccessTokenService = async (refreshToken) => {
  

  // ✅ Step 1: Verify token first
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch (err) {
    throw new Error('Invalid refresh token');
  }

  // ✅ Step 2: Find user
  const user = await User.findById(decoded._id);
  if (!user) {
    throw new Error('Invalid refresh token');
  }

  // ✅ Step 3: Generate new tokens
  const payload = { _id: user._id, role: user.role };
  const accessToken = user.generateAccessToken(payload);
  const newRefreshToken = user.generateRefreshToken(payload);

  // ✅ Step 4: Save new refresh token (invalidate old one)
  // user.refreshToken = newRefreshToken;
  // await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken: newRefreshToken };
};


export const forgetPasswordService = async (email) => {

  if (!email) throw new Error('Email is required');

  const user = await User.findOne({ email });
  if (!user) throw new Error('Invalid email');

  const otp = Math.floor(100000 + Math.random() * 900000);
  const otpExpires = new Date(Date.now() + emailExpires);

  user.otp = otp;
  user.otpExpires = otpExpires;
  user.otpVerified = false;
  user.isVerified = false;
  user.resetExpires = null;

  await user.save({ validateBeforeSave: false });

  await sendEmail({
    to: email,
    subject: 'Password Reset OTP',
    html: verificationCodeTemplate(otp),
  });

  return { otp };
};


export const verifyCodeService = async ({ email, otp }) => {
  if (!email || !otp) throw new Error('Email and otp are required');

  const user = await User.findOne({ email });
  if (!user) throw new Error('Invalid email');

  if (!user.otp || !user.otpExpires) throw new Error('Otp not found');

  if (
    parseInt(user.otp, 10) !== parseInt(otp, 10) ||
    Date.now() > user.otpExpires.getTime()
  ) {
    throw new Error('Invalid or expired otp');
  }

  user.otp = undefined;
  user.otpExpires = undefined;
  user.otpVerified = true;
  user.isVerified = true;
  // user.resetExpires = new Date(Date.now() + 15 * 60 * 1000); 

  await user.save();

  return;
};


export const resetPasswordService = async ({ email, newPassword }) => {

  if (!email || !newPassword)
    throw new Error('Email and new password are required');

  const user = await User.findOne({ email });
  if (!user) throw new Error('Invalid email');

  if (!user.otpVerified || !user.isVerified) {
    throw new Error('otp not cleared');
  }

  user.password = newPassword;
  user.otpVerified = false;
  user.isVerified = false;
  user.resetExpires = null;

  await user.save();

  return;
};


export const changePasswordService = async ({ userId, oldPassword, newPassword }) => {
  
  if (!userId || !oldPassword || !newPassword) throw new Error('User id, old password and new password are required');

  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const isMatch = await user.comparePassword(userId, oldPassword);
  if (!isMatch) throw new Error('Invalid old password');

  user.password = newPassword;
  await user.save();

  return
};
