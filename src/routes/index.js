// ============================================
// FILE: src/routes/index.js
// ============================================

import express from 'express';
import authRoutes  from '../modules/auth/auth.routes.js';
import userRoutes from '../modules/user/user.routes.js';
import broadcastRoutes from '../modules/broadcast/broadcast.routes.js';

// import matchRoutes from '../modules/match-result/match-result.routes.js';

import tournamentRoutes from '../modules/tournament/tournament.routes.js';
import roundRoutes from '../modules/round/round.routes.js';
import matchTournamentRoutes from '../modules/match/match.routes.js';
import articleRoutes from '../modules/article/article.routes.js';
import contactRoutes from '../modules/contact/contact.routes.js';
import userDashboardRoutes from '../modules/user-dashboard/userDashboard.routes.js';
import organizerDashboardRoutes from '../modules/organizer-dashboard/organizerDashboard.routes.js';
import adminDashboardRoutes from '../modules/admin-dashboard/adminDashboard.routes.js';
import adminTeam from '../modules/team/team.routes.js';
import playerManagement from '../modules/tournamentPlayer/tournamentPlayer.routes.js';



const router = express.Router();

router.use('/auth', authRoutes);
router.use('/user', userRoutes);

// router.use('/match-result', matchRoutes);
router.use('/article', articleRoutes);
router.use('/tournament', tournamentRoutes);
router.use("/round", roundRoutes);
router.use('/match', matchTournamentRoutes)
router.use('/broadcast', broadcastRoutes);
router.use('/contact', contactRoutes);
router.use('/user-dashboard', userDashboardRoutes);
router.use('/organizer-dashboard', organizerDashboardRoutes);
router.use('/admin-dashboard', adminDashboardRoutes);
router.use('/admin-team', adminTeam)
router.use('/players', playerManagement)


export default router;