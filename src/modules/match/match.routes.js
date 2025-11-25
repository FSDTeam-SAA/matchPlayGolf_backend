import express from "express";
import {
  createTournamentMatch,
  getAllTournamentMatches,
  getTournamentMatchById,
  getTournamentMatchesByRound,
  updateTournamentMatch,
  updateTournamentMatchScores,
  deleteTournamentMatch
} from "./match.controller.js";
import { verifyToken } from "../../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.get("/", getAllTournamentMatches);
router.get("/:id", getTournamentMatchById);
router.get("/round/:roundId", getTournamentMatchesByRound);

// Protected routes
router.post("/", verifyToken, createTournamentMatch);
router.put("/:id", verifyToken, updateTournamentMatch);
router.patch("/:id/scores", verifyToken, updateTournamentMatchScores);
router.delete("/:id", verifyToken, deleteTournamentMatch);

export default router;