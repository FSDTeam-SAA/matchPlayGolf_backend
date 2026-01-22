import mongoose from "mongoose";
import Tournament from "../tournament/tournament.model.js";
import RegisterUser from "../others/tournamentPlayer.model.js";
import TournamentMatch from "../match/match.model.js";

const { ObjectId } = mongoose.Types;

class OrganizerDashboardService {
  /**
   * Summary cards for organizer: active tournaments, total players, ongoing and upcoming matches.
   */
  async getSummary(organizerId) {
    const organizerObjectId = new ObjectId(organizerId);

    // Fetch tournaments created by this organizer
    const tournaments = await Tournament.find({ createdBy: organizerObjectId }).select(
      "_id status"
    );
    const tournamentIds = tournaments.map((t) => t._id);

    const activeTournamentCount = tournaments.filter(
      (t) => t.status !== "Cancelled" && t.status !== "Completed"
    ).length;

    const totalPlayers = tournamentIds.length
      ? await RegisterUser.countDocuments({ tournamentId: { $in: tournamentIds } })
      : 0;

    // Match counts scoped to organizer's tournaments
    const [ongoingMatches, upcomingMatches] = tournamentIds.length
      ? await Promise.all([
          TournamentMatch.countDocuments({
            tournamentId: { $in: tournamentIds },
            status: "In Progress"
          }),
          TournamentMatch.countDocuments({
            tournamentId: { $in: tournamentIds },
            status: "Upcoming"
          })
        ])
      : [0, 0];

    return {
      activeTournaments: activeTournamentCount,
      totalPlayers,
      ongoingMatches,
      upcomingMatches
    };
  }

  /**
   * Recent tournaments for organizer (top 3 by createdAt).
   */
  async getRecentTournaments(organizerId, limit = 3) {
    const organizerObjectId = new ObjectId(organizerId);

    // Use createdAt for "recent" to mirror creation order and avoid date shuffling
    const tournaments = await Tournament.find({ createdBy: organizerObjectId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("tournamentName location drawSize startDate createdAt")
      .lean();

    return tournaments;
  }

  /**
   * Get monthly participant counts for an organizer's tournaments in a year.
   */
  async getParticipantsByMonth({ organizerId, year = new Date().getFullYear() }) {
    try {
      const organizerObjectId = new ObjectId(organizerId);
      const numericYear = parseInt(year, 10);

      // 1) All tournaments of this organizer in that year
      const tournaments = await Tournament.find({
        createdBy: organizerObjectId,
        startDate: {
          $gte: new Date(numericYear, 0, 1),
          $lt: new Date(numericYear + 1, 0, 1)
        }
      }).select("_id");

      if (!tournaments.length) {
        const monthNames = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December"
        ];
        return {
          year: numericYear,
          data: monthNames.map((month) => ({ month, participants: 0 }))
        };
      }

      const tournamentIds = tournaments.map((t) => t._id);

      // 2) Aggregate registrations for those tournaments, by registration date (createdAt)
      const results = await RegisterUser.aggregate([
        {
          $match: {
            tournamentId: { $in: tournamentIds },
            createdAt: {
              $gte: new Date(numericYear, 0, 1),
              $lt: new Date(numericYear + 1, 0, 1)
            },
            isActive: true
          }
        },
        {
          $group: {
            _id: { month: { $month: "$createdAt" } },
            count: { $sum: 1 }
          }
        },
        { $sort: { "_id.month": 1 } }
      ]);

      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"
      ];

      const monthlyData = monthNames.map((monthName, index) => {
        const monthNumber = index + 1;
        const monthData = results.find((r) => r._id.month === monthNumber);
        return {
          month: monthName,
          participants: monthData ? monthData.count : 0
        };
      });

      return {
        year: numericYear,
        data: monthlyData
      };
    } catch (error) {
      console.error("Error in getParticipantsByMonth:", error);
      throw error;
    }
  }
}

export default new OrganizerDashboardService();
