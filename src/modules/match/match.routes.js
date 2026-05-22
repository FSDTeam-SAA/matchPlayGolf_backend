import express from "express";
import {
  conditionalAuth,
  createTournamentMatch,
  deleteTournamentMatch,
  getAllTournamentMatches,
  getUserActiveTournaments,
  getUserMatchesWithFilters,
  getUserTournamentMatches,
  getTournamentMatchById,
  getTournamentMatchesByRound,
  swapMatchPlayers,
  updateTournamentMatch,
  updateTournamentMatchScores,
} from "./match.controller.js";
import { verifyToken } from "../../middleware/authMiddleware.js";
import { multerUpload } from "../../config/multer.js";

const router = express.Router();

// Create
router.post("/", verifyToken, createTournamentMatch);

// List / filters
router.get("/", getAllTournamentMatches);
router.get("/userall", verifyToken, getUserMatchesWithFilters);
router.get("/specific-tournament", verifyToken, getUserTournamentMatches);
router.get("/active-tournaments", verifyToken, getUserActiveTournaments);
router.get("/round/:roundId", getTournamentMatchesByRound);

// Actions
router.patch("/swap-players", verifyToken, swapMatchPlayers);
router.put(
  "/:matchId",
  conditionalAuth,
  multerUpload.array("matchPhotos", 10),
  updateTournamentMatch
);
router.put("/:matchId/scores", verifyToken, updateTournamentMatchScores);
router.delete("/:matchId", verifyToken, deleteTournamentMatch);

// Detail
router.get("/:id", getTournamentMatchById);

export default router;
