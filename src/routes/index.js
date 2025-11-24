// ============================================
// FILE: src/routes/index.js
// ============================================

import express from 'express';
import authRoutes  from '../modules/auth/auth.routes.js';
import userRoutes from '../modules/user/user.routes.js';
import broadcastRoutes from '../modules/broadcast/broadcast.routes.js';
import matchRoutes from '../modules/match/match.routes.js';
import tournamentRoutes from '../modules/tournament/tournament.routes.js';
import articleRoutes from '../modules/article/article.routes.js';
import contactRoutes from '../modules/contact/contact.routes.js';



const router = express.Router();

router.use('/auth', authRoutes);
router.use('/user', userRoutes);

router.use('/match', matchRoutes);
router.use('/article', articleRoutes);
router.use('/tournament', tournamentRoutes);
router.use('/broadcast', broadcastRoutes);
router.use('/contact', contactRoutes);



export default router;
