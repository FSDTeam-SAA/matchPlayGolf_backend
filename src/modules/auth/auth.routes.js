import express from 'express';
import {
  loginUser,
  registerUser,
  forgetPassword,
  verifyCode,
  resetPassword,
  changePassword,
  importPlayers,
  setPassword
} from './auth.controller.js';
import { verifyToken } from '../../middleware/authMiddleware.js';


const router = express.Router();


router.post('/register', registerUser);
router.post('/import', verifyToken, importPlayers);
router.post('/set-password', setPassword);
router.post('/login', loginUser);
router.post('/forget-password', forgetPassword);
router.post('/verify-code', verifyCode);
router.post('/reset-password', resetPassword);
router.post('/change-password',verifyToken, changePassword);
// router.post('/logout', verifyToken, logoutUser);


export default router;