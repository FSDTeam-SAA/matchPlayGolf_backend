import express from "express";
import {
  createTournament,
  getAllTournaments,
  getTournamentById,
  updateTournament,
  deleteTournament,
  getTournamentsByCreator,
  sendInvitationRegisteredUsers,
  findTournamentPlayer,
  getTournamentMatchesController
} from "./tournament.controller.js";
import {
  initializeKnockout,
  generateNextRound,
  updateMatchResult,
  toggleTournamentHold,
  rescheduleMatch,
  getKnockoutStage
} from "./autometicRound.controller.js"
import { verifyToken } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", verifyToken, createTournament);
router.get("/", getAllTournaments);
router.get("/creator", verifyToken, getTournamentsByCreator);
router.post("/:id", verifyToken, sendInvitationRegisteredUsers);
router.put("/:tournamentId", verifyToken, updateTournament);
router.delete("/:id", verifyToken, deleteTournament);
router.get("/:id", getTournamentById);
router.get("/findplayer/:tournamentId", verifyToken, findTournamentPlayer);
router.get("/getAllMatches/:tournamentId", getTournamentMatchesController)


//knockout management
router.post('/:tournamentId/initialize', verifyToken, initializeKnockout);
router.post('/:tournamentId/next-round', verifyToken, generateNextRound);
router.put('/:tournamentId/match/:matchId', verifyToken, updateMatchResult);
router.patch('/:tournamentId/hold', verifyToken, toggleTournamentHold);
router.patch('/:tournamentId/match/:matchId/reschedule', verifyToken, rescheduleMatch);
router.get('/:tournamentId', getKnockoutStage);



export default router;