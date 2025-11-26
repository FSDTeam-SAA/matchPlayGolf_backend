import express from "express";
import { verifyToken } from "../../middleware/authMiddleware.js";
import {
  getOrganizerSummary,
  getOrganizerRecentTournaments
} from "./organizerDashboard.controller.js";

const router = express.Router();

// GET /api/organizer-dashboard/summary
router.get("/summary", verifyToken, getOrganizerSummary);

// GET /api/organizer-dashboard/recent
router.get("/recent", verifyToken, getOrganizerRecentTournaments);

export default router;
