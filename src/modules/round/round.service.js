import Round from "./round.model.js";
import Tournament from "../tournament/tournament.model.js";
import mongoose from "mongoose";

class RoundService {
  /**
   * Create a new round
   */
  async createRound(roundData) {
    try {
      // Check if tournament exists
      if (!mongoose.Types.ObjectId.isValid(roundData.tournamentId)) {
        throw new Error("Invalid tournament ID");
      }

      const tournament = await Tournament.findById(roundData.tournamentId);
      if (!tournament) {
        throw new Error("Tournament not found");
      }

      // Check if round number already exists for this tournament
      const existingRound = await Round.findOne({
        tournamentId: roundData.tournamentId,
        roundNumber: roundData.roundNumber
      });

      if (existingRound) {
        throw new Error("Round number already exists for this tournament");
      }

      const round = await Round.create(roundData);
      const populatedRound = await round.populate([
        { path: "tournamentId", select: "tournamentName sportName location" },
        { path: "createdBy", select: "fullName email" }
      ]);

      return populatedRound;
    } catch (error) {
      throw new Error(`Failed to create round: ${error.message}`);
    }
  }

  /**
   * Get all rounds with filters and pagination
   */
  async getAllRounds(filters = {}, page = 1, limit = 10) {
    try {
      const query = {};

      if (filters.tournamentId) {
        if (!mongoose.Types.ObjectId.isValid(filters.tournamentId)) {
          throw new Error("Invalid tournament ID");
        }
        query.tournamentId = filters.tournamentId;
      }

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.courseId) {
        if (!mongoose.Types.ObjectId.isValid(filters.courseId)) {
          throw new Error("Invalid course ID");
        }
        query.courseId = filters.courseId;
      }

      const skip = (page - 1) * limit;
      const total = await Round.countDocuments(query);

      const rounds = await Round.find(query)
        .populate("tournamentId", "tournamentName sportName location")
        .populate("createdBy", "fullName email")
        .sort({ date: 1, roundNumber: 1 })
        .skip(skip)
        .limit(limit);

      return {
        rounds,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRounds: total
      };
    } catch (error) {
      throw new Error(`Failed to fetch rounds: ${error.message}`);
    }
  }

  /**
   * Get round by ID
   */
  async getRoundById(id) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid round ID");
      }

      const round = await Round.findById(id)
        .populate("tournamentId", "tournamentName sportName location")
        .populate("createdBy", "fullName email");

      if (!round) {
        throw new Error("Round not found");
      }

      return round;
    } catch (error) {
      throw new Error(`Failed to fetch round: ${error.message}`);
    }
  }

  /**
   * Get rounds by tournament ID
   */
  async getRoundsByTournament(tournamentId, page = 1, limit = 10) {
    try {
      if (!mongoose.Types.ObjectId.isValid(tournamentId)) {
        throw new Error("Invalid tournament ID");
      }

      console.log("mahabur");
      const query = { tournamentId };
      const skip = (page - 1) * limit;
      const total = await Round.countDocuments(query);

      const rounds = await Round.find(query)
        .populate("tournamentId", "tournamentName location")
        .populate("createdBy", "fullName email")
        .sort({ roundNumber: 1 })
        .skip(skip)
        .limit(limit);

      return {
        rounds,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRounds: total
      };
    } catch (error) {
      throw new Error(`Failed to fetch tournament rounds: ${error.message}`);
    }
  }

  /**
   * Update round
   */
  async updateRound(id, updateData, userId, role) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid round ID");
      }

      const round = await Round.findById(id).populate("tournamentId");

      if (!round) {
        throw new Error("Round not found");
      }

      // Check authorization
      const isOwner = round.tournamentId.createdBy.toString() === userId.toString();
      const isAdmin = role === "admin";

      if (!isAdmin && !isOwner) {
        throw new Error("Not authorized to update this round");
      }

      // Validate status if provided
      if (updateData.status && !["Scheduled", "In Progress", "Completed", "Cancelled"].includes(updateData.status)) {
        throw new Error("Invalid status");
      }

      Object.assign(round, updateData);
      await round.save();

      return await round.populate([
        { path: "tournamentId", select: "tournamentName sportName, location" },
        { path: "createdBy", select: "fullName email" }
      ]);
    } catch (error) {
      throw new Error(`Failed to update round: ${error.message}`);
    }
  }

  /**
   * Delete round
   */
  async deleteRound(id, userId, role) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid round ID");
      }

      const round = await Round.findById(id).populate("tournamentId");

      if (!round) {
        throw new Error("Round not found");
      }

      // Check authorization
      const isOwner = round.tournamentId.createdBy.toString() === userId.toString();
      const isAdmin = role === "admin";

      if (!isOwner && !isAdmin) {
        throw new Error("Not authorized to delete this round");
      }

      await round.deleteOne();

      return { message: "Round deleted successfully" };
    } catch (error) {
      throw new Error(`Failed to delete round: ${error.message}`);
    }
  }
}

export default new RoundService();