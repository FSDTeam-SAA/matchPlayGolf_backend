// ============================================
// FILE: src/routes/index.js
// ============================================

import express from 'express';
import authRoutes  from '../modules/auth/auth.routes.js';
// import messageRoutes from "../components/messages/message.routes.js";
// import userRoutes from './user.routes.js';
// import chatRoutes from './chat.routes.js';

const router = express.Router();

router.use('/auth', authRoutes);
// router.use('/messages', messageRoutes);

export default router;