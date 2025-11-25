import express from "express";
import {
  createMatch,
  getAllMatches,
  getMatchById,
  getMatchesByRound,
  updateMatch,
  updateMatchScores,
  deleteMatch
} from "./match.controller.js";
import { verifyToken } from "../../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.get("/", getAllMatches);
router.get("/:id", getMatchById);
router.get("/round/:roundId", getMatchesByRound);

// Protected routes
router.post("/", verifyToken, createMatch);
router.put("/:id", verifyToken, updateMatch);
router.patch("/:id/scores", verifyToken, updateMatchScores);
router.delete("/:id", verifyToken, deleteMatch);

export default router;
