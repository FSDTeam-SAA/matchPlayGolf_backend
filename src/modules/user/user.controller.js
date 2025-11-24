// src/modules/user/user.controller.js
import {
  getUserProfile,
  updateUserProfile,
  uploadUserProfileImage,
} from './user.service.js';

// =============== GET PROFILE ===============
export const getProfile = async (req, res) => {
  try {
    const userId = req.user?._id; // set by verifyToken middleware

    const user = await getUserProfile(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile fetched successfully',
      data: user,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// =============== UPDATE PROFILE (TEXT FIELDS ONLY) ===============
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user?._id;
    const updateData = req.body; // JSON body

    const updatedUser = await updateUserProfile(userId, updateData);

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    console.error('Update profile error:', error);

    if (error.code === 'EMAIL_IN_USE') {
      return res.status(400).json({
        success: false,
        message: 'Email already in use',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// =============== UPLOAD PROFILE IMAGE (IMAGE ONLY) ===============
export const uploadProfileImage = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const imageUrl = await uploadUserProfileImage(userId, req.file.buffer);

    if (!imageUrl) {
      return res.status(500).json({
        success: false,
        message: 'Failed to upload image',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile image uploaded successfully',
      data: { profileImage: imageUrl },
    });
  } catch (error) {
    console.error('Upload profile image error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
