// ==================== services/user.service.js ====================
import User from './user.model.js';
import { uploadToCloudinary }  from '../../lib/uploadToCloudinary.js';

// ==================== GET PROFILE SERVICE ====================
export const getUserProfile = async (userId) => {
  const user = await User.findById(userId).select('-password');
  return user || null;
};

// ==================== UPDATE PROFILE SERVICE ====================
export const updateUserProfile = async (userId, updateData) => {
  const allowedFields = [
    'fullName',
    'email',
    'phoneNumber',
    'country',
    'city',
    'state',
    'zipcode',
    'street_address'
  ];

  // Filter allowed fields only
  const updates = {};
  for (const key of allowedFields) {
    if (updateData[key]) updates[key] = updateData[key];
  }

  const user = await User.findByIdAndUpdate(
    userId,
    updates,
    { new: true }
  ).select('-password');

  return user || null;
};

// ==================== UPLOAD PROFILE IMAGE SERVICE ====================
export const uploadUserProfileImage = async (userId, fileBuffer) => {
  const uploadResult = await uploadToCloudinary (fileBuffer, 'profile_images');

  if (!uploadResult?.secure_url) return null;

  // Update image URL in DB
  await User.findByIdAndUpdate(userId, {
    profileImage: uploadResult.secure_url
  });

  return uploadResult.secure_url;
};
