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
import { multerUpload } from '../../config/multer.js';


const router = express.Router();

router.post('/:tournamentId/next-round', verifyToken, generateNextRound);
router.post('/:tournamentId/initialize', verifyToken, initializeKnockout);
router.put('/:tournamentId/match/:matchId', verifyToken, updateMatchResult);
router.patch('/:tournamentId/hold', verifyToken, toggleTournamentHold);
router.patch('/:tournamentId/match/:matchId/reschedule', verifyToken, rescheduleMatch);
router.get('/knockout/:tournamentId', getKnockoutStage);

router.post("/", verifyToken, createTournament);
router.get("/", getAllTournaments);
router.get("/creator", verifyToken, getTournamentsByCreator);
router.post("/:id", verifyToken, sendInvitationRegisteredUsers);
router.put("/:tournamentId", verifyToken, multerUpload.single('csvFile'), updateTournament);
router.delete("/:id", verifyToken, deleteTournament);
router.get("/:id", verifyToken, getTournamentById);
router.get("/findplayer/:tournamentId", verifyToken, findTournamentPlayer);
router.get("/getAllMatches/:tournamentId", getTournamentMatchesController)




export default router;