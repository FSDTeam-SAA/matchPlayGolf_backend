import adminDashboardService from "./adminDashboard.service.js";

const ensureAdmin = (user) => {
  const role = user?.role;
  const normalized = typeof role === "string" ? role.toLowerCase() : "";
  if (normalized !== "admin") {
    const err = new Error("Access denied: admin only");
    err.status = 403;
    throw err;
  }
};

export const getAdminOverview = async (req, res) => {
  try {
    ensureAdmin(req.user);
    const data = await adminDashboardService.getOverview();
    return res.status(200).json({
      success: true,
      data,
      message: "Admin dashboard overview fetched successfully"
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to fetch admin overview"
    });
  }
};

export const getAdminActivity = async (req, res) => {
  try {
    ensureAdmin(req.user);
    const year = req.query.year ? parseInt(req.query.year, 10) : undefined;
    const data = await adminDashboardService.getActivityFlow(year);
    return res.status(200).json({
      success: true,
      data,
      message: "Admin activity flow fetched successfully"
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to fetch admin activity"
    });
  }
};
