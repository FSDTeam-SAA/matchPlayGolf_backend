import Match from "./match.model.js";
import Round from "../round/round.model.js";
import Tournament from "../tournament/tournament.model.js";
import mongoose from "mongoose";

class MatchService {
  /**
   * Create a new match
   */
  async createMatch(matchData) {
    try {
      // Validate tournament exists
      if (!mongoose.Types.ObjectId.isValid(matchData.tournamentId)) {
        throw new Error("Invalid tournament ID");
      }

      const tournament = await Tournament.findById(matchData.tournamentId);
      if (!tournament) {
        throw new Error("Tournament not found");
      }

      // Validate round exists
      if (!mongoose.Types.ObjectId.isValid(matchData.roundId)) {
        throw new Error("Invalid round ID");
      }

      const round = await Round.findById(matchData.roundId);
      if (!round) {
        throw new Error("Round not found");
      }

      // Validate matchType
      if (!["single", "pair", "team"].includes(matchData.matchType)) {
        throw new Error("Invalid match type. Must be single, pair, or team");
      }

      // Validate data structure based on matchType
      if (matchData.matchType === "single") {
        if (!matchData.players || matchData.players.length < 2) {
          throw new Error("Single match requires at least 2 players");
        }
      } else {
        if (!matchData.teams || matchData.teams.length < 2) {
          throw new Error("Pair/Team match requires at least 2 teams");
        }
      }

      const match = await Match.create(matchData);
      const populatedMatch = await match.populate([
        { path: "tournamentId", select: "tournamentName sportName format" },
        { path: "roundId", select: "roundName roundNumber date" },
        { path: "players.userId", select: "fullName email" },
        { path: "teams.players.userId", select: "fullName email" },
        { path: "createdBy", select: "fullName email" }
      ]);

      return populatedMatch;
    } catch (error) {
      throw new Error(`Failed to create match: ${error.message}`);
    }
  }

  /**
   * Get all matches with filters and pagination
   */
  async getAllMatches(filters = {}, page = 1, limit = 10) {
    try {
      const query = {};

      if (filters.tournamentId) {
        if (!mongoose.Types.ObjectId.isValid(filters.tournamentId)) {
          throw new Error("Invalid tournament ID");
        }
        query.tournamentId = filters.tournamentId;
      }

      if (filters.roundId) {
        if (!mongoose.Types.ObjectId.isValid(filters.roundId)) {
          throw new Error("Invalid round ID");
        }
        query.roundId = filters.roundId;
      }

      if (filters.matchType) {
        query.matchType = filters.matchType;
      }

      if (filters.status) {
        query.status = filters.status;
      }

      const skip = (page - 1) * limit;
      const total = await Match.countDocuments(query);

      const matches = await Match.find(query)
        .populate("tournamentId", "tournamentName sportName format")
        .populate("roundId", "roundName roundNumber date")
        .populate("players.userId", "fullName email")
        .populate("teams.players.userId", "fullName email")
        .populate("createdBy", "fullName email")
        .sort({ teeTime: 1 })
        .skip(skip)
        .limit(limit);

      return {
        matches,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalMatches: total
      };
    } catch (error) {
      throw new Error(`Failed to fetch matches: ${error.message}`);
    }
  }

  /**
   * Get match by ID
   */
  async getMatchById(id) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid match ID");
      }

      const match = await Match.findById(id)
        .populate("tournamentId", "tournamentName sportName format")
        .populate("roundId", "roundName roundNumber date")
        .populate("players.userId", "fullName email")
        .populate("teams.players.userId", "fullName email")
        .populate("createdBy", "fullName email")
        .populate("updatedBy", "fullName email");

      if (!match) {
        throw new Error("Match not found");
      }

      return match;
    } catch (error) {
      throw new Error(`Failed to fetch match: ${error.message}`);
    }
  }

  /**
   * Get matches by round
   */
  async getMatchesByRound(roundId, page = 1, limit = 10) {
    try {
      if (!mongoose.Types.ObjectId.isValid(roundId)) {
        throw new Error("Invalid round ID");
      }

      const query = { roundId };
      const skip = (page - 1) * limit;
      const total = await Match.countDocuments(query);

      const matches = await Match.find(query)
        .populate("tournamentId", "tournamentName sportName format")
        .populate("players.userId", "fullName email")
        .populate("teams.players.userId", "fullName email")
        .populate("createdBy", "fullName email")
        .sort({ teeTime: 1, groupNumber: 1 })
        .skip(skip)
        .limit(limit);

      return {
        matches,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalMatches: total
      };
    } catch (error) {
      throw new Error(`Failed to fetch round matches: ${error.message}`);
    }
  }

  /**
   * Update match
   */
  async updateMatch(id, updateData, userId, role) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid match ID");
      }

      const match = await Match.findById(id).populate("tournamentId");

      if (!match) {
        throw new Error("Match not found");
      }

      // Check authorization
      const isOwner = match.tournamentId.createdBy.toString() === userId.toString();
      const isAdmin = role === "admin";

      if (!isAdmin && !isOwner) {
        throw new Error("Not authorized to update this match");
      }

      // Validate status if provided
      if (updateData.status && !["Scheduled", "In Progress", "Completed", "Cancelled"].includes(updateData.status)) {
        throw new Error("Invalid status");
      }

      // Validate matchType if provided
      if (updateData.matchType && !["single", "pair", "team"].includes(updateData.matchType)) {
        throw new Error("Invalid match type");
      }

      Object.assign(match, updateData);
      match.updatedBy = userId;
      await match.save();

      return await match.populate([
        { path: "tournamentId", select: "tournamentName sportName format" },
        { path: "roundId", select: "roundName roundNumber date" },
        { path: "players.userId", select: "fullName email" },
        { path: "teams.players.userId", select: "fullName email" },
        { path: "createdBy", select: "fullName email" },
        { path: "updatedBy", select: "fullName email" }
      ]);
    } catch (error) {
      throw new Error(`Failed to update match: ${error.message}`);
    }
  }

  /**
   * Update match scores
   */
  async updateMatchScores(id, scoresData, userId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid match ID");
      }

      const match = await Match.findById(id);

      if (!match) {
        throw new Error("Match not found");
      }

      // Update scores based on match type
      if (match.matchType === "single" && scoresData.players) {
        match.players = scoresData.players;
      } else if (["pair", "team"].includes(match.matchType) && scoresData.teams) {
        match.teams = scoresData.teams;
      }

      // Update winner if provided
      if (scoresData.winnerPlayerId) {
        match.winnerPlayerId = scoresData.winnerPlayerId;
      }
      if (scoresData.winnerTeamId) {
        match.winnerTeamId = scoresData.winnerTeamId;
      }

      match.updatedBy = userId;
      await match.save();

      return await match.populate([
        { path: "tournamentId", select: "tournamentName sportName" },
        { path: "roundId", select: "roundName roundNumber" },
        { path: "players.userId", select: "fullName email" },
        { path: "teams.players.userId", select: "fullName email" }
      ]);
    } catch (error) {
      throw new Error(`Failed to update match scores: ${error.message}`);
    }
  }

  /**
   * Delete match
   */
  async deleteMatch(id, userId, role) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid match ID");
      }

      const match = await Match.findById(id).populate("tournamentId");

      if (!match) {
        throw new Error("Match not found");
      }

      // Check authorization
      const isOwner = match.tournamentId.createdBy.toString() === userId.toString();
      const isAdmin = role === "admin";

      if (!isOwner && !isAdmin) {
        throw new Error("Not authorized to delete this match");
      }

      await match.deleteOne();

      return { message: "Match deleted successfully" };
    } catch (error) {
      throw new Error(`Failed to delete match: ${error.message}`);
    }
  }
}

export default new MatchService();

