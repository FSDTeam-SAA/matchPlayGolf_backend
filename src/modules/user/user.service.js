// src/modules/user/user.service.js
import User from './user.model.js';
import { uploadToCloudinary } from '../../lib/uploadToCloudinary.js';

// Fields we allow returning in profile responses (keeps address out)
const profileProjection =
  'fullName email phone gender country clubName handicap whsNumber organizationName sportNationalId profileImage organizerLogo role isVerified createdAt updatedAt';

// =============== GET PROFILE SERVICE ===============
export const getUserProfile = async (userId) => {
  const user = await User.findById(userId).select(profileProjection);
  return user || null;
};

// =============== UPDATE PROFILE SERVICE ===============
// Only updates: fullName, email, phone, gender, clubName, handicap, whsNumber
export const updateUserProfile = async (userId, updateData) => {
  const allowedFields = [
    'fullName',
    'email',
    'phone',
    'gender',
    'country',
    'clubName',
    'handicap',
    'whsNumber',
    'organizationName',
    'sportNationalId',
    'organizerLogo',
  ];

  const user = await User.findById(userId).select(profileProjection);
  if (!user) return null;

  const updates = {};

  for (const field of allowedFields) {
    // handle email specially (duplicate check + skip if same)
    if (field === 'email' && updateData.email) {
      if (updateData.email === user.email) {
        // same email, no change
        continue;
      }

      const existing = await User.findOne({ email: updateData.email });
      if (existing && existing._id.toString() !== user._id.toString()) {
        const err = new Error('Email already in use');
        err.code = 'EMAIL_IN_USE';
        throw err;
      }

      updates.email = updateData.email;
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(updateData, field)) {
      updates[field] = updateData[field];
    }
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: updates },
    { new: true }
  ).select(profileProjection);

  return updatedUser;
};

// =============== UPLOAD PROFILE IMAGE SERVICE ===============
export const uploadUserProfileImage = async (userId, fileBuffer) => {
  if (!fileBuffer) return null;

  const uploadResult = await uploadToCloudinary(
    fileBuffer,
    'profile_image',
    'profile_images'
  );

  if (!uploadResult?.secure_url) return null;

  await User.findByIdAndUpdate(userId, {
    profileImage: uploadResult.secure_url,
  });

  return uploadResult.secure_url;
};

// =============== UPLOAD ORGANIZER LOGO SERVICE ===============
export const uploadOrganizerLogo = async (userId, fileBuffer) => {
  if (!fileBuffer) return null;

  const uploadResult = await uploadToCloudinary(
    fileBuffer,
    'organizer_logo',
    'organizer_logos'
  );

  if (!uploadResult?.secure_url) return null;

  await User.findByIdAndUpdate(userId, {
    organizerLogo: uploadResult.secure_url,
  });

  return uploadResult.secure_url;
};
