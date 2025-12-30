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
  getTournamentMatchesController,
  progressTournament,
  eventStartInvitationRegisteredUsers
} from "./tournament.controller.js";
import { getPaymentBystripeSessionId } from "../payment/payment.controller.js";
import {
  initializeKnockout,
  generateNextRound,
  updateMatchResult,
  toggleTournamentHold,
  rescheduleMatch,
  getKnockoutStage,
  getMatchesByRound
} from "./autometicRound.controller.js"
import { verifyToken } from "../../middleware/authMiddleware.js";
import { multerUpload } from '../../config/multer.js';


const router = express.Router();

//static route

router.get("/creator", verifyToken, getTournamentsByCreator);
router.post("/", verifyToken, createTournament);
router.get("/", getAllTournaments);
router.get("/findplayer/:tournamentId", verifyToken, findTournamentPlayer);
router.get("/getPayemtInfo/:stripeSessionId", verifyToken, getPaymentBystripeSessionId);
router.get('/knockout/:tournamentId', getKnockoutStage);
router.get("/getAllMatches/:tournamentId", getTournamentMatchesController)


//dynamic route
router.post('/:tournamentId/tournament-progress', verifyToken, progressTournament);
router.post('/:tournamentId/event-started', verifyToken, eventStartInvitationRegisteredUsers)
router.post('/:tournamentId/next-round', verifyToken, generateNextRound);
router.post('/:tournamentId/initialize', verifyToken, initializeKnockout);
router.put('/:tournamentId/match/:matchId', verifyToken, updateMatchResult);
router.put('/:tournamentId/hold', verifyToken, toggleTournamentHold);
router.put('/:tournamentId/match/:matchId/reschedule', verifyToken, rescheduleMatch);
router.get('/:tournamentId/:round', getMatchesByRound)
router.post("/:id", verifyToken, sendInvitationRegisteredUsers);
router.put("/:tournamentId", verifyToken, multerUpload.single('csvFile'), updateTournament);
router.delete("/:id", verifyToken, deleteTournament);
router.get("/:id", getTournamentById);




export default router;