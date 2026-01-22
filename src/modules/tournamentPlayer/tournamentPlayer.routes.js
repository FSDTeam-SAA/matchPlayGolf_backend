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
router.get(
  '/:playerId',
  verifyToken,
  TournamentPlayerController.getPlayerById
);
router.put(
  '/:playerId',
  verifyToken,
  TournamentPlayerController.updatePlayer
);
router.delete(
  '/:playerId',
  verifyToken,
  TournamentPlayerController.deletePlayer
);
router.patch(
  '/players/:playerId/toggle-status',
  TournamentPlayerController.togglePlayerStatus
);
router.get(
  '/tournaments/:tournamentId/players',
  TournamentPlayerController.getPlayersByTournament
);
router.get(
  '/tournaments/:tournamentId/players/stats',
  TournamentPlayerController.getPlayerStats
);

export default router;