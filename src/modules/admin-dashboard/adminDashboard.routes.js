import express from "express";
import { verifyToken } from "../../middleware/authMiddleware.js";
import { getAdminOverview, getAdminActivity } from "./adminDashboard.controller.js";

const router = express.Router();

// GET /api/admin-dashboard/overview
router.get("/overview", verifyToken, getAdminOverview);

// GET /api/admin-dashboard/activity?year=2025
router.get("/activity", verifyToken, getAdminActivity);

export default router;
