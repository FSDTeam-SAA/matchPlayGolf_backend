import mongoose from "mongoose";
import Match from "../match/match.model.js";
import MatchResult from "../match-result/match-result.model.js";
import Tournament from "../tournament/tournament.model.js";
import Round from "../round/round.model.js";
import RegisterUser from "../others/tournamentPlayer.model.js";

const { ObjectId } = mongoose.Types;

class UserDashboardService {
  /**
   * Build a reusable participant filter for tournament matches.
   */
  buildParticipantFilter(userId) {
    const id = new ObjectId(userId);
    return {
      $or: [
        { "players.userId": id },
        { "teams.players.userId": id }
      ]
    };
  }

  /**
   * Get summary card metrics for the dashboard.
   */
  async getUserSummary(userId) {
    const participantFilter = this.buildParticipantFilter(userId);
    const userObjectId = new ObjectId(userId);

    // Tournament matches and personal matches (match-result module)
    const [MatchStats, personalMatches] = await Promise.all([
      this.getMatchStats(participantFilter, userObjectId),
      this.getPersonalMatchStats(userObjectId)
    ]);

    // Current round: prefer "In Progress", fall back to the nearest scheduled
    const currentRound = await this.getCurrentRound(userObjectId);

    const totalMatchesPlayed = MatchStats.played + personalMatches.played;
    const totalWins = MatchStats.wins + personalMatches.wins;
    const winRate = totalMatchesPlayed > 0 ? Number(((totalWins / totalMatchesPlayed) * 100).toFixed(2)) : 0;

    return {
      matchesPlayed: totalMatchesPlayed,
      wins: totalWins,
      winRate,
      currentRound,
      pendingResults: MatchStats.pending
    };
  }

  async getMatchStats(participantFilter, userObjectId) {
    const matchQuery = { ...participantFilter, status: { $ne: "Cancelled" } };

    const [played, wins, pending] = await Promise.all([
      Match.countDocuments(matchQuery),
      Match.countDocuments({
        ...matchQuery,
        status: "Completed",
        $or: [
          { winnerPlayerId: userObjectId },
          { winnerTeamId: { $exists: true, $ne: null } }
        ]
      }),
      Match.countDocuments({
        ...matchQuery,
        status: "In Progress"
      })
    ]);

    return { played, wins, pending };
  }

  async getPersonalMatchStats(userObjectId) {
    const personalMatches = await MatchResult.find({ createdBy: userObjectId }).select("yourScore opponentScore");

    const played = personalMatches.length;
    const wins = personalMatches.reduce((acc, match) => {
      if (typeof match.yourScore === "number" && typeof match.opponentScore === "number" && match.yourScore > match.opponentScore) {
        return acc + 1;
      }
      return acc;
    }, 0);

    return { played, wins };
  }

  async getCurrentRound(userObjectId) {
    const tournamentIds = await this.getTournamentIdsForUser(userObjectId);
    if (!tournamentIds.length) return null;

    // If the user has an in-progress match, surface that round even if the round document is still Scheduled
    const inProgressMatch = await Match.findOne({
      ...this.buildParticipantFilter(userObjectId),
      tournamentId: { $in: tournamentIds },
      status: "In Progress"
    })
      .populate("roundId", "roundName roundNumber date status tournamentId")
      .populate("roundId.tournamentId", "tournamentName")
      .sort({ teeTime: 1, createdAt: 1 });

    if (inProgressMatch?.roundId) {
      const roundDoc = inProgressMatch.roundId;
      return {
        roundName: roundDoc.roundName,
        roundNumber: roundDoc.roundNumber,
        status: "In Progress",
        date: roundDoc.date,
        tournament: {
          id: roundDoc.tournamentId?._id,
          name: roundDoc.tournamentId?.tournamentName
        }
      };
    }

    // Otherwise prefer active round, otherwise earliest scheduled
    const inProgressRound = await Round.findOne({
      tournamentId: { $in: tournamentIds },
      status: "In Progress"
    })
      .populate("tournamentId", "tournamentName")
      .sort({ date: 1 });

    const scheduledRound = !inProgressRound
      ? await Round.findOne({
          tournamentId: { $in: tournamentIds },
          status: "Scheduled"
        })
          .populate("tournamentId", "tournamentName")
          .sort({ date: 1 })
      : null;

    const round = inProgressRound || scheduledRound;

    if (!round) return null;

    return {
      roundName: round.roundName,
      roundNumber: round.roundNumber,
      status: round.status,
      date: round.date,
      tournament: {
        id: round.tournamentId?._id,
        name: round.tournamentId?.tournamentName
      }
    };
  }

  /**
   * Get current tournaments for the user with next match info.
   */
  async getUserTournaments(userId) {

    const userObjectId = new ObjectId(userId);
    const tournamentIds = await this.getTournamentIdsForUser(userObjectId);
    if (!tournamentIds.length) return [];

    // Fetch all tournaments the user is tied to (any status) so nothing is filtered out unexpectedly
    const tournaments = await Tournament.find({
      _id: { $in: tournamentIds }
    }).sort({ startDate: 1 });

    const participantFilter = this.buildParticipantFilter(userId);

    return Promise.all(
      tournaments.map(async (tournament) => {
        const currentRound = await Round.findOne({
          tournamentId: tournament._id,
          status: { $in: ["In Progress", "Scheduled"] }
        })
          .sort({ roundNumber: 1 })
          .select("roundName roundNumber status date");

        const nextMatch = await Match.findOne({
          ...participantFilter,
          tournamentId: tournament._id,
          status: { $in: ["Upcoming", "Scheduled", "In Progress"] }
        })
          .populate("roundId", "roundName roundNumber date")
          .populate("players.userId", "fullName")
          .populate("teams.players.userId", "fullName")
          .sort({ teeTime: 1, createdAt: 1 });

        return {
          id: tournament._id,
          tournamentName: tournament.tournamentName,
          status: tournament.status,
          startDate: tournament.startDate,
          endDate: tournament.endDate,
          location: tournament.location,
          currentRound: currentRound
            ? {
                roundName: currentRound.roundName,
                roundNumber: currentRound.roundNumber,
                status: currentRound.status,
                date: currentRound.date
              }
            : null,
          nextMatch: nextMatch ? this.formatNextMatch(nextMatch, userObjectId) : null
        };
      })
    );
  }

  async getTournamentIdsForUser(userObjectId) {
    const [registeredIds, matchTournamentIds, createdIds] = await Promise.all([
      RegisterUser.distinct("tournamentId", { userId: userObjectId }),
      Match.distinct("tournamentId", this.buildParticipantFilter(userObjectId)),
      Tournament.distinct("_id", { createdBy: userObjectId })
    ]);

    const ids = new Set([
      ...registeredIds.map(String),
      ...matchTournamentIds.map(String),
      ...createdIds.map(String)
    ]);

    return Array.from(ids).map((id) => new ObjectId(id));
  }

  formatNextMatch(match, userObjectId) {
    const opponentNames = [];

    if (match.matchType === "single") {
      for (const player of match.players || []) {
        if (player?.userId && player.userId._id?.toString() !== userObjectId.toString()) {
          opponentNames.push(player.userId.fullName || "Opponent");
        }
      }
    } else {
      for (const team of match.teams || []) {
        const hasUser = (team.players || []).some((p) => p?.userId?._id?.toString() === userObjectId.toString());
        if (!hasUser) {
          const names = (team.players || [])
            .map((p) => p?.userId?.fullName)
            .filter(Boolean);
          if (names.length) {
            opponentNames.push(names.join(", "));
          }
        }
      }
    }

    const opponent = opponentNames.length ? opponentNames.join(" / ") : null;

    return {
      id: match._id,
      status: match.status,
      date: match.teeTime || match.createdAt,
      matchType: match.matchType,
      round: match.roundId
        ? {
            id: match.roundId._id,
            roundName: match.roundId.roundName,
            roundNumber: match.roundId.roundNumber,
            date: match.roundId.date
          }
        : null,
      opponent
    };
  }
}

export default new UserDashboardService();
