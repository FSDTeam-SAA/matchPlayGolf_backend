import express from "express";
import { verifyToken } from "../../middleware/authMiddleware.js";
import {
  getDashboardSummary,
  getUserCurrentTournaments,
  getUserTournaments,
  getPlayerMatches,
  getPlayerMatchesByTournament
} from "./userDashboard.controller.js";

const router = express.Router();

// GET /api/user-dashboard/summary
router.get("/summary", verifyToken, getDashboardSummary);

// GET /api/user-dashboard/tournaments
router.get("/tournaments", verifyToken, getUserCurrentTournaments);
router.get("/user-tournaments", verifyToken, getUserTournaments);
router.get("/player-matches", verifyToken, getPlayerMatches);
router.get("/player-matches/:tournamentId", verifyToken, getPlayerMatchesByTournament);

export default router;