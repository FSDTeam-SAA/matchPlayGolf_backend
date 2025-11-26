import userDashboardService from "./userDashboard.service.js";

export const getDashboardSummary = async (req, res) => {
  try {
    const summary = await userDashboardService.getUserSummary(req.user._id);

    return res.status(200).json({
      success: true,
      data: summary,
      message: "User dashboard summary fetched successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch dashboard summary"
    });
  }
};

export const getUserCurrentTournaments = async (req, res) => {
  try {
    const tournaments = await userDashboardService.getUserTournaments(req.user._id);

    return res.status(200).json({
      success: true,
      data: tournaments,
      message: "User tournaments fetched successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch user tournaments"
    });
  }
};
