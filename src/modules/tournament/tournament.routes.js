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



export default router;