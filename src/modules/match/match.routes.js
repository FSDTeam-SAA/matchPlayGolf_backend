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
import { multerUpload } from "../../config/multer.js";

const router = express.Router();

// Public routes
router.get("/", getAllTournamentMatches);
router.get("/:id", getTournamentMatchById);
router.get("/round/:roundId", getTournamentMatchesByRound);

// Protected routes
router.post("/", verifyToken, createTournamentMatch);

// ✅ single update route with photo support
router.put(
  "/:id",
  verifyToken,
  multerUpload.single("photo"),   // field name = photo
  updateTournamentMatch
);

router.put("/:matchId/scores", verifyToken, updateTournamentMatchScores);
router.delete("/:matchId", verifyToken, deleteTournamentMatch);

export default router;