import Tournament from "../tournament/tournament.model.js";
import TournamentPlayer from "../others/tournamentPlayer.model.js";
import Match from "../match/match.model.js";
import User from "../user/user.model.js";
import Payment from "../payment/payment.model.js";

class AdminDashboardService {
  /**
   * Overview cards + recent lists for admin.
   */
  // async getOverview() {
  //   const activeTournaments = await Tournament.countDocuments({
  //     status: { $nin: ["Cancelled", "Completed"] }
  //   });

  //   // Unique players across all tournament registrations
  //   const totalPlayers = await TournamentPlayer.distinct("userId").then((ids) => ids.length);

  //   const ongoingMatches = await Match.countDocuments({ status: "In Progress" });

  //   // Use createdAt for "recent" to avoid shuffling when start dates vary
  //   const recentTournaments = await Tournament.find({})
  //     .sort({ createdAt: -1 })
  //     .limit(3)
  //     .select("tournamentName location startDate endDate createdAt status")
  //     .lean();

  //   const recentRegistrations = await TournamentPlayer.find({})
  //     .sort({ createdAt: -1 })
  //     .limit(3)
  //     .populate("userId", "fullName email profileImage")
  //     .populate("tournamentId", "tournamentName");

  //   return {
  //     cards: {
  //       activeTournaments,
  //       totalPlayers,
  //       ongoingMatches
  //     },
  //     recentTournaments,
  //     recentRegistrations: recentRegistrations.map((reg) => ({
  //       id: reg._id,
  //       user: reg.userId
  //         ? {
  //             id: reg.userId._id,
  //             name: reg.userId.fullName,
  //             email: reg.userId.email,
  //             profileImage: reg.userId.profileImage
  //           }
  //         : null,
  //       tournament: reg.tournamentId
  //         ? {
  //             id: reg.tournamentId._id,
  //             name: reg.tournamentId.tournamentName
  //           }
  //         : null,
  //       createdAt: reg.createdAt
  //     }))
  //   };
  // }

  async getOverview() {
  const activeTournaments = await Tournament.countDocuments({
    status: { $nin: ["Cancelled", "Completed"] }
  });

  // Unique players across all tournament registrations
  const totalPlayers = await TournamentPlayer.distinct("playerId").then(ids => ids.length);

  const ongoingMatches = await Match.countDocuments({ status: { $in: ["Upcoming", "In Progress"] }});
  console.log(ongoingMatches);

  // Use createdAt for "recent" to avoid shuffling when start dates vary
  const recentTournaments = await Tournament.find({})
    .sort({ createdAt: -1 })
    .limit(3)
    .select("tournamentName location startDate endDate createdAt status")
    .lean();

  const recentRegistrations = await TournamentPlayer.find({})
    .sort({ createdAt: -1 })
    .limit(3)
    .populate("playerId", "fullName email profileImage")
    .populate("tournamentId", "tournamentName");

  return {
    cards: {
      activeTournaments,
      totalPlayers,
      ongoingMatches
    },
    recentTournaments,
    recentRegistrations: recentRegistrations.map(reg => ({
      id: reg._id,
      user: reg.playerId
        ? {
            id: reg.playerId._id,
            name: reg.playerId.fullName,
            email: reg.playerId.email,
            profileImage: reg.playerId.profileImage
          }
        : null,
      tournament: reg.tournamentId
        ? {
            id: reg.tournamentId._id,
            name: reg.tournamentId.tournamentName
          }
        : null,
      createdAt: reg.createdAt
    }))
  };
}


  /**
   * Monthly revenue activity for a given year (defaults to current year).
   */
  async getActivityFlow(yearInput) {
    const now = new Date();
    const year = Number.isInteger(yearInput) ? yearInput : now.getFullYear();

    const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
    const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);

    // Only completed payments count as revenue
    const payments = await Payment.find({
      status: "completed",
      createdAt: { $gte: startOfYear, $lte: endOfYear }
    }).select("amount createdAt");

    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec"
    ];

    const revenueByMonth = months.map((month) => ({ month, revenue: 0 }));

    for (const payment of payments) {
      const amt = parseFloat(payment.amount);
      if (Number.isNaN(amt)) continue;
      const mIndex = new Date(payment.createdAt).getUTCMonth(); // 0-based
      if (mIndex >= 0 && mIndex < 12) {
        revenueByMonth[mIndex].revenue += amt;
      }
    }

    return {
      year,
      data: revenueByMonth
    };
  }
}

export default new AdminDashboardService();
