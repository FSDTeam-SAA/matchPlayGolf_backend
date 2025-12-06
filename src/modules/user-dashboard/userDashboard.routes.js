import express from "express";
import { verifyToken } from "../../middleware/authMiddleware.js";
import {
  getDashboardSummary,
  getUserCurrentTournaments
} from "./userDashboard.controller.js";

const router = express.Router();

// GET /api/user-dashboard/summary
router.get("/summary", verifyToken, getDashboardSummary);

// GET /api/user-dashboard/tournaments
router.get("/tournaments", verifyToken, getUserCurrentTournaments);

export default router;