import Tournament from "./tournament.model.js";
import mongoose from "mongoose";
import paymentService from "../payment/payment.service.js";
import { createCheckoutSession } from "../payment/payment.controller.js";
import { importMultipleUsersService } from "../auth/auth.service.js";
import  roundService from "../round/round.service.js";

class TournamentService {
  /**
   * Create a new tournament
   */
  async createTournament(tournamentData) {
    try {
      const tournament = await Tournament.create(tournamentData);

      let players = [];
      if(tournamentData.importPlayer){
        players = await importPlayers(importPlayer);
      }

      let setRounds = [];
      if(tournamentData.rounds){
        setRounds = await createRound(rounds);
      }

      // Call checkout session using the created tournament record
      const payment = await createCheckoutSession(
        tournament.price,                                // OK
        tournament.billingAddress?.email,                // FIXED
        tournament._id,                                  // FIXED (use saved tournament)
        tournament.tournamentName,                       // OK
        tournament.createdBy                             // OK
      );

      const tournamentDetails = await tournament.populate(
        "createdBy",
        "fullName email"
      );

      return {tournamentDetails, payment};
    } catch (error) {
      throw new Error(`Failed to create tournament: ${error.message}`);
    }
  }

  /**
   * Get all tournaments with pagination and filtering
   */
  async getAllTournaments(filters = {}, page = 1, limit = 10) {
    try {
      const query = {};

      // Apply filters
      if (filters.sportName) {
        query.sportName = { $regex: filters.sportName, $options: "i" };
      }
      if (filters.drawFormat) {
        query.drawFormat = filters.drawFormat;
      }
      if (filters.format) {
        query.format = filters.format;
      }
      if (filters.paymentStatus) {
        query.paymentStatus = { $regex: filters.paymentStatus, $options: "i" };
      }

      const skip = (page - 1) * limit;
      const total = await Tournament.countDocuments(query);

      const tournaments = await Tournament.find(query)
        .populate("createdBy", "fullName email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return {
        tournaments,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalTournaments: total
      };
    } catch (error) {
      throw new Error(`Failed to fetch tournaments: ${error.message}`);
    }
  }

  /**
   * Get tournament by ID
   */
  async getTournamentById(id) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid tournament ID");
      }

      const tournament = await Tournament.findById(id).populate(
        "createdBy",
        "fullName email"
      );

      if (!tournament) {
        throw new Error("Tournament not found");
      }

      return tournament;
    } catch (error) {
      throw new Error(`Failed to fetch tournament: ${error.message}`);
    }
  }

 /**
 * Update tournament
 */
async updateTournament(id, updateData, userId, role) {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid tournament ID");
    }

    const tournament = await Tournament.findById(id);

    if (!tournament) {
      throw new Error("Tournament not found");
    }

    const isOwner = tournament.createdBy.toString() === userId.toString();
    const isAdmin = role === "admin";

    // Check if user is authorized
    if (!isAdmin && !isOwner) {
      throw new Error("Not authorized to update this tournament");
    }

    // Validate drawFormat if provided
    if (
      updateData.drawFormat &&
      !["Matrix", "Knockout", "Teams"].includes(updateData.drawFormat)
    ) {
      throw new Error("Invalid draw format");
    }

    // Validate format if provided
    if (
      updateData.format &&
      !["Single", "Pair", "Team"].includes(updateData.format)
    ) {
      throw new Error("Invalid format");
    }

    let players = [];
    let setRounds = [];

    // Handle player imports
    if (updateData.importPlayers && Array.isArray(updateData.importPlayers)) {
      players = await importMultipleUsersService(
        updateData.importPlayers, 
        id, 
        userId
      );
    }

    // Handle rounds creation/update
    if (updateData.rounds) {
      if (Array.isArray(updateData.rounds)) {
        // Multiple rounds
        for (const round of updateData.rounds) {
          const roundResult = await roundService.createOrUpdateRound(
            id,
            round.roundName,
            round.roundNumber,
            round.date,
            round.status || "Scheduled",
            userId
          );
          setRounds.push(roundResult);
        }
      } else {
        // Single round
        const roundResult = await createOrUpdateRound(
          id,
          updateData.rounds.roundName,
          updateData.rounds.roundNumber,
          updateData.rounds.date,
          updateData.rounds.status || "Scheduled",
          userId
        );
        setRounds.push(roundResult);
      }
    }

    // Remove non-model fields before saving
    const { importPlayers, rounds, ...tournamentUpdates } = updateData;
    
    // Update tournament fields
    Object.assign(tournament, tournamentUpdates);
    await tournament.save();

    const tournamentData = await tournament.populate("createdBy", "fullName email");
    
    return { tournamentData, players, setRounds };
  } catch (error) {
    throw new Error(`Failed to update tournament: ${error.message}`);
  }
}

  /**
   * Delete tournament
   */
  async deleteTournament(id, userId, role) {
    try {
      // Validate ID format
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid tournament ID");
      }

      const tournament = await Tournament.findById(id);

      if (!tournament) {
        throw new Error("Tournament not found");
      }

      // Authorization: Creator OR Admin can delete
      const isOwner = tournament.createdBy.toString() === userId.toString();
      const isAdmin = role === "admin";

      if (!isOwner && !isAdmin) {
        throw new Error("Not authorized to delete this tournament");
      }

      await tournament.deleteOne();

      return { message: "Tournament deleted successfully" };
    } catch (error) {
      throw new Error(`Failed to delete tournament: ${error.message}`);
    }
  }

  /**
   * Get tournaments by creator
   */
  async getTournamentsByCreator(creatorId, filters = {}, page = 1, limit = 10) {
    try {
      const query = { createdBy: creatorId };

      // Apply filters
      if (filters.paymentStatus) {
        query.paymentStatus = { $regex: filters.paymentStatus, $options: "i" };
      }

      const skip = (page - 1) * limit;

      // Count with filters
      const total = await Tournament.countDocuments(query);

      const tournaments = await Tournament.find(query)
        .populate("createdBy", "fullName email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return {
        tournaments,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalTournaments: total
      };
    } catch (error) {
      throw new Error(`Failed to fetch creator tournaments: ${error.message}`);
    }
  }

}

export default new TournamentService();