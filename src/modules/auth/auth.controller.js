import { generateResponse } from '../../middleware/responseFormate.js';
import {
  loginUserService,
  registerUserService,
  changePasswordService,
  resetPasswordService,
  verifyCodeService,
  forgetPasswordService,
} from './auth.service.js';
import dotenv from 'dotenv';
dotenv.config();


export const registerUser = async (req, res, next) => {
  const { fullName, email, password, phone, clubName, handicap } = req.body;
  try {

    const data = await registerUserService({ fullName, email, password, phone });
    generateResponse(res, 201, true, 'Registered user successfully!', data);
  }

  catch (error) {

    if (error.message === 'User already registered.') {
      generateResponse(res, 400, false, 'User already registered', null);
    }

    else {
      next(error)
    }
  }
};


export const loginUser = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const { accessToken, refreshToken, user } = await loginUserService({ email, password });
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,        
      secure: true, 
      sameSite: 'strict',   
      path: '/',             
      maxAge: 30 * 24 * 60 * 60 * 1000, 
    });
    generateResponse(res, 200, true, 'Login successful', { accessToken, refreshToken, user });
  }

  catch (error) {
    if (error.message === 'Email and password are required') {
      generateResponse(res, 400, false, 'Email and password are required', null);
    }

    else if (error.message === 'User not found') {
      generateResponse(res, 404, false, 'User not found', null);
    }

    else if (error.message === 'Invalid password') {
      generateResponse(res, 400, false, 'Invalid password', null);
    }

    else {
      next(error)
    }
  }
};




export const forgetPassword = async (req, res, next) => {

  const { email } = req.body;
  try {
    const { otp } = await forgetPasswordService(email);
    generateResponse(res, 200, true, 'Verification code sent to your email', { otp });
  }

  catch (error) {

    if (error.message === 'Email is required') {
      generateResponse(res, 400, false, 'Email is required', null);
    }

    else if (error.message === 'Invalid email') {
      generateResponse(res, 400, false, 'Invalid email', null);
    }

    else {
      next(error)
    }
  }
};


export const verifyCode = async (req, res, next) => {
  const { otp, email } = req.body;
  try {
    await verifyCodeService({ otp, email });
    generateResponse(res, 200, true, 'Verification successful', null);
  }

  catch (error) {
    if (error.message === 'Email and otp are required') {
      generateResponse(res, 400, false, 'Email and otp is required', null);
    }

    else if (error.message === 'Invalid email') {
      generateResponse(res, 400, false, 'Invalid email', null);
    }

    else if (error.message === 'Otp not found') {
      generateResponse(res, 404, false, 'Otp not found', null);
    }

    else if (error.message === 'Invalid or expired otp') {
      generateResponse(res, 403, false, 'Invalid or expired otp', null);
    }

    else {
      next(error)
    }
  }
};


export const resetPassword = async (req, res, next) => {

  const { email, newPassword } = req.body;
  try {

    await resetPasswordService({ email, newPassword });
    generateResponse(res, 200, true, 'Password reset successfully', null);
  }

  catch (error) {
    if (error.message === 'Email and new password are required') {
      generateResponse(res, 400, false, 'Email and new password are required', null);
    }

    else if (error.message === 'Invalid email') {
      generateResponse(res, 400, false, 'Invalid email', null);
    }

    else if (error.message === 'otp not cleared') {
      generateResponse(res, 403, false, 'otp not cleared', null);
    }

    else {
      next(error)
    }
  }
};


export const changePassword = async (req, res, next) => {
  
  const { oldPassword, newPassword } = req.body;
  const userId = req.user._id;
  console.log('User ID in changePassword controller:', userId);
  try {
    await changePasswordService({ userId, oldPassword, newPassword });
    generateResponse(res, 200, true, 'Password changed successfully', null);
  }

  catch (error) {
    if (error.message === 'Old and new passwords are required') {
      generateResponse(res, 400, false, 'Old and new passwords are required', null);
    }

    else if (error.message === 'Password does not match') {
      generateResponse(res, 400, false, 'Password does not match', null);
    }

    else {
      next(error)
    }
  }
};


export const logoutUser = async (req, res, next) => {

  const token = req.token;
  try {

    // Decode token to verify user identity
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // Store token in blacklist (so it can’t be reused)
    // await Blacklist.create({ token, userId: decoded.id, expiredAt: decoded.exp * 1000 });
   
    // Clear refresh token cookie and remove from user record
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });
    generateResponse(res, 200, true, 'Logged out successfully', null);
  }

  catch (error) {
    next(error);
  }
};