// ============================================
// FILE: src/routes/index.js
// ============================================

import express from 'express';
import authRoutes  from '../modules/auth/auth.routes.js';
import userRoutes from '../modules/user/user.routes.js';

import matchRoutes from '../modules/match/match.routes.js';
import tournamentRoutes from '../modules/tournament/tournament.routes.js';



const router = express.Router();

router.use('/auth', authRoutes);
router.use('/user', userRoutes);

router.use('/match', matchRoutes);
router.use('/tournament', tournamentRoutes);



export default router;