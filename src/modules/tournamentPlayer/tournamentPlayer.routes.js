// src/routes/tournamentPlayer.routes.js
import express from 'express';
import  TournamentPlayerController  from './tournamentPlayer.controller.js';
import { verifyToken, adminMiddleware, organizerMiddleware } from "../../middleware/authMiddleware.js";

const router = express.Router();


router.get(
  '/all',
  verifyToken,
  TournamentPlayerController.getAllPlayers
);

// Get single player by ID
router.get(
  '/:playerId',
  verifyToken,
  TournamentPlayerController.getPlayerById
);
// Delete player
router.delete(
  '/players/:playerId',
  verifyToken,
  TournamentPlayerController.deletePlayer
);

// // Toggle player status
router.patch(
  '/players/:playerId/toggle-status',
  TournamentPlayerController.togglePlayerStatus
);

// Tournament-specific routes
// Get all players for a tournament
router.get(
  '/tournaments/:tournamentId/players',
  TournamentPlayerController.getPlayersByTournament
);

// Get player statistics for tournament
router.get(
  '/tournaments/:tournamentId/players/stats',
  TournamentPlayerController.getPlayerStats
);

export default router;