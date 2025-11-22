import express from 'express';
import {
getProfile,
updateProfile,
uploadProfileImage
} from './user.controller.js';
import { verifyToken } from '../../middleware/authMiddleware.js';


const router = express.Router();


router.get('/', verifyToken, getProfile);
router.put('/profile',verifyToken, updateProfile);
router.put('/profile/image', verifyToken, uploadProfileImage);
// router.post('/verify-code', verifyCode);
// router.post('/reset-password', resetPassword);
// router.post('/change-password',verifyToken, changePassword);
// // router.post('/logout', verifyToken, logoutUser);


export default router;