// ==================== controllers/user.controller.js ====================
import { 
  getUserProfile,
  updateUserProfile,
  uploadUserProfileImage

 } from './user.service.js';
// import logger from '../utils/logger.js';

// ==================== GET PROFILE ====================  
export const getProfile = async (req, res) => {
  try {
    console.log(req.user);
    const user = await getUserProfile(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    // logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// ==================== UPDATE PROFILE ====================  
export const updateProfile = async (req, res) => {
  try {
    const updatedUser = await updateUserProfile(
      req.user.userId,
      req.body
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// ==================== UPLOAD PROFILE IMAGE ====================  
export const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const imageUrl = await uploadUserProfileImage(
      req.user.userId,
      req.file.buffer
    );

    if (!imageUrl) {
      return res.status(500).json({
        success: false,
        message: 'Image upload failed'
      });
    }

    res.json({
      success: true,
      message: 'Profile image uploaded successfully',
      data: { profileImage: imageUrl }
    });

  } catch (error) {
    // logger.error('Upload profile image error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
