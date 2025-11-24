// ============================================
// FILE: src/routes/index.js
// ============================================

import express from 'express';
import authRoutes  from '../modules/auth/auth.routes.js';
import userRoutes from '../modules/user/user.routes.js';
import tournamentRoutes from '../modules/tournament/tournament.routes.js';
import roundRoutes from '../modules/round/round.routes.js';
import matchRoutes from '../modules/match/match.routes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/tournament', tournamentRoutes);
router.use("/round", roundRoutes);
router.use('/match', matchRoutes)


export default router;