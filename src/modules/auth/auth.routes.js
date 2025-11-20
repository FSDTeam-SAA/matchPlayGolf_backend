import express from 'express';
import {
  loginUser,
  registerUser
} from './auth.controller.js';
import { verifyToken } from '../../middleware/authMiddleware.js';
// import { verifyToken } from '../../core/middlewares/authMiddleware.js';


const router = express.Router();


router.post('/register', registerUser);
router.post('/login', loginUser);
// router.get('/users', verifyToken, getAllUsers);
// router.post('/forget-password', forgetPassword);
// router.post('/verify-code', verifyCode);
// router.post('/reset-password', resetPassword);
// router.post('/change-password',verifyToken, changePassword);
// router.post('/logout', verifyToken, logoutUser);


export default router;