// src/modules/user/user.routes.js
import express from 'express';
import {
  getProfile,
  updateProfile,
  uploadProfileImage,
  uploadOrganizerLogoController,
} from './user.controller.js';
import { verifyToken } from '../../middleware/authMiddleware.js';
import { multerUpload } from '../../config/multer.js';

const router = express.Router();

// GET /api/user  → fetch current user's profile
router.get('/', verifyToken, getProfile);

// PUT /api/user/profile  → update personal info (JSON only)
router.put('/profile', verifyToken, updateProfile);

// PUT /api/user/profile/image  → upload profile picture (FormData with "file")
router.put(
  '/profile/image',
  verifyToken,
  multerUpload.single('profileImage'),
  uploadProfileImage
);

// PUT /api/user/profile/organizer-logo  → upload organizer logo (FormData with "organizerLogo")
router.put(
  '/profile/organizer-logo',
  verifyToken,
  multerUpload.single('organizerLogo'),
  uploadOrganizerLogoController
);

export default router;
