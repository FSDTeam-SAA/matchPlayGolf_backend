import express from "express";
import {
  createRound,
  getAllRounds,
  getRoundById,
  getRoundsByTournament,
  updateRound,
  deleteRound
} from "./round.controller.js";
import { verifyToken } from "../../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.get("/", getAllRounds);
router.get("/:id", getRoundById);
router.get("/tournament/:tournamentId", getRoundsByTournament);

// Protected routes
router.post("/", verifyToken, createRound);
router.put("/:id", verifyToken, updateRound);
router.delete("/:id", verifyToken, deleteRound);

export default router;