import organizerDashboardService from "./organizerDashboard.service.js";

const ensureOrganizer = (user) => {
  const role = user?.role;
  const normalizedRole = typeof role === "string" ? role.toLowerCase() : "";

  if (!["organizer", "admin"].includes(normalizedRole)) {
    const err = new Error("Access denied: organizer or admin only");
    err.status = 403;
    throw err;
  }
};

export const getOrganizerSummary = async (req, res) => {
  try {
    ensureOrganizer(req.user);
    const data = await organizerDashboardService.getSummary(req.user._id);
    return res.status(200).json({
      success: true,
      data,
      message: "Organizer dashboard summary fetched successfully"
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to fetch organizer summary"
    });
  }
};

export const getOrganizerRecentTournaments = async (req, res) => {
  try {
    ensureOrganizer(req.user);
    const limit = parseInt(req.query.limit, 10) || 3;
    const data = await organizerDashboardService.getRecentTournaments(req.user._id, limit);
    return res.status(200).json({
      success: true,
      data,
      message: "Organizer recent tournaments fetched successfully"
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to fetch organizer tournaments"
    });
  }
};
