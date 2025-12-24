import express from "express";
import {
  createTournamentMatch,
  getAllTournamentMatches,
  getTournamentMatchById,
  getTournamentMatchesByRound,
  updateTournamentMatch,
  updateTournamentMatchScores,
  deleteTournamentMatch,
  getUserMatchesWithFilters,
  getUserTournamentMatches,
  getUserActiveTournaments
} from "./match.controller.js";
import { verifyToken } from "../../middleware/authMiddleware.js";
import { multerUpload } from "../../config/multer.js";

const router = express.Router();

// Public routes
router.get("/userall", verifyToken, getUserMatchesWithFilters);
router.get("/specific-tournament", verifyToken, getUserTournamentMatches);
router.get("/active-tournaments", verifyToken, getUserActiveTournaments);
router.get("/", getAllTournamentMatches);
router.get("/:id", getTournamentMatchById);
router.get("/round/:roundId", getTournamentMatchesByRound);


router.post("/", verifyToken, createTournamentMatch);

router.put(
  "/:id",
  verifyToken,
  multerUpload.single("photo"),   
  updateTournamentMatch
);

router.put("/:matchId/scores", verifyToken, updateTournamentMatchScores);
router.delete("/:matchId", verifyToken, deleteTournamentMatch);

export default router;