import mongoose from "mongoose";
import Tournament from "../tournament/tournament.model.js";
import RegisterUser from "../tournamentResgisterUser/registerUser.model.js";
import TournamentMatch from "../match/match.model.js";

const { ObjectId } = mongoose.Types;

class OrganizerDashboardService {
  /**
   * Summary cards for organizer: active tournaments, total players, ongoing and upcoming matches.
   */
  async getSummary(organizerId) {
    const organizerObjectId = new ObjectId(organizerId);

    // Fetch tournaments created by this organizer
    const tournaments = await Tournament.find({ createdBy: organizerObjectId }).select("_id status");
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
      .select("tournamentName location startDate endDate createdAt status")
      .lean();

    return tournaments;
  }
}

export default new OrganizerDashboardService();
