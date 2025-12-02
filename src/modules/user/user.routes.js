// src/modules/user/user.routes.js
import express from 'express';
import {
  getProfile,
  updateProfile,
  uploadProfileImage
} from './user.controller.js';
import { verifyToken } from '../../middleware/authMiddleware.js';
import { multerUpload } from '../../config/multer.js';

const router = express.Router();

router.get('/', verifyToken, getProfile);
router.get('/profile', verifyToken, getProfile);
router.put('/profile', verifyToken,  multerUpload.single('organizerLogo'), updateProfile);
router.put(
  '/profile/image',
  verifyToken,
  multerUpload.single('profileImage'),
  uploadProfileImage
);
// router.put(
//   '/profile/organizer-logo',
//   verifyToken,
//   multerUpload.single('organizerLogo'),
//   uploadOrganizerLogoController
// );

export default router;
