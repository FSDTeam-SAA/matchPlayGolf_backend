import Tournament from "./tournament.model.js";
import mongoose from "mongoose";
import { createCheckoutSession } from "../payment/payment.controller.js";
import User from "../user/user.model.js";
import TournamentPair from "../others/tournamentPair.model.js";
import TournamentPlayer from "../others/tournamentPlayer.model.js";
import Round from "../round/round.model.js";
import Match from "../match/match.model.js";

class TournamentService {
  /**
   * Create a new tournament
   */
  async createTournament(tournamentData) {
    try {
      console.log(tournamentData);
      const tournament = await Tournament.create(tournamentData);
      let payment = {};

      // Call checkout session using the created tournament record
      if(tournamentData.role === "Organizer"){
          payment = await createCheckoutSession(
            tournament.price,                                // OK
            tournament.billingAddress?.email,                // FIXED
            tournament._id,                                  // FIXED (use saved tournament)
            tournament.tournamentName,                       // OK
            tournament.createdBy                             // OK
          );

      }

      const tournamentDetails = await tournament.populate(
        "createdBy",
        "fullName email role"
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

    // ------- FILTERS -------
    if (filters.sportName) {
      query.sportName = { $regex: filters.sportName, $options: "i" };
    }
    if (filters.drawFormat) {
      query.drawFormat = filters.drawFormat;
    }
    if (filters.format) {
      query.format = filters.format;
    }
    if (filters.tournamentName) {
      query.tournamentName = { $regex: filters.tournamentName, $options: "i" };
    }
    if (filters.location) {
      query.location = filters.location;
    }
    if (filters.paymentStatus) {
      query.paymentStatus = { $regex: filters.paymentStatus, $options: "i" };
    }
    if (filters.status) {
      query.status = { $regex: filters.status, $options: "i" };
    }

    const skip = (page - 1) * limit;
    const total = await Tournament.countDocuments(query);

    // ------- GET TOURNAMENTS -------
    const tournaments = await Tournament.find(query)
      .populate("createdBy", "fullName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // ------- GET PLAYER COUNT FOR EACH TOURNAMENT -------
    const tournamentsWithPlayerCount = await Promise.all(
      tournaments.map(async (tournament) => {
        const playerCount = await TournamentPlayer.countDocuments({
          tournamentId: tournament._id,
        });

        return {
          ...tournament.toObject(),
          playerCount, // <-- ONLY total count
        };
      })
    );

    return {
      tournaments: tournamentsWithPlayerCount,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: total,
        totalPages: Math.ceil(total / limit),
      },
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
  async findOrCreateUsers (players){
    const userIds = [];
    
    for (const player of players) {
      let user = await User.findOne({ email: player.email });
      
      if (!user) {
        user = await User.create({
          fullName: player.fullName,
          email: player.email,
          phone: player.phone,
        });
      }
      
      userIds.push(user._id);
    }
    
    return userIds;
  };

  /**
   * Register players for single format tournament
   */
  async registerSinglePlayers(tournamentId, userIds){
    const registrations = [];
    
    for (const userId of userIds) {
      const existing = await TournamentPlayer.findOne({
        tournamentId,
        playerId: userId,
      });
      
      if (!existing) {
        const registration = await TournamentPlayer.create({
          tournamentId,
          playerId: userId,
          pairId: null,
        });
        registrations.push(registration);
      }
    }
    
    return registrations;
  };

  /**
   * Register players for pair format tournament
   */
  async registerPairPlayers(tournamentId, players, userIds){
    if (userIds.length !== 2) {
      throw new Error("Pair format requires exactly 2 players");
    }
    
    const pair = await TournamentPair.create({
      tournamentId,
      teamName: `${players[0].fullName} & ${players[1].fullName}`,
      player1: userIds[0],
      player2: userIds[1],
    });
    
    await TournamentPlayer.create({
      tournamentId,
      playerId: null,
      pairId: pair._id,
    });
    
    return pair;
  };

async createRounds(tournamentId, rounds, createdBy) {
  const createdRounds = [];

  for (let i = 0; i < rounds.length; i++) {
    const data = rounds[i];

    if (!data.date) {
      throw new Error(`Round ${i + 1}: Date is required`);
    }

    const existingRound = await Round.findOne({
      tournamentId,
      date: data.date,
    });

    if (existingRound) {
      throw new Error(
        `Round already exists for date ${data.date}. Please choose another date.`
      );
    }

    const round = await Round.create({
      tournamentId,
      roundName: data.roundName || `Round ${i + 1}`,
      roundNumber: data.roundNumber || i + 1,
      date: data.date,
      status: data.status || "Scheduled",
      createdBy,
    });

    createdRounds.push(round);
  }

  return createdRounds;
}

  /**
   * Update tournament service
   */
  async updateTournamentService(tournamentId, updateData, userId, role){
    const { status, rules, rounds, players, location } = updateData;
    console.log(tournamentId);
    
    // Find tournament
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }
    console.log(tournament.createdBy, userId);
    const isOwner = tournament.createdBy.toString() === userId.toString();
    const isAdmin = role === "admin";

    // Check if user is authorized
    if (!isAdmin && !isOwner) {
      throw new Error("Not authorized to update this tournament");
    }
    
    const format = tournament.format;
    const tournamentUpdateData = {};
    let registrationResult = null;
    let createdRounds = null;
    
    // Handle basic field updates (only if provided)
    if (status !== undefined) {
      tournamentUpdateData.status = status;
    }
    
    if (rules !== undefined) {
      tournamentUpdateData.rules = rules;
    }

     if (location !== undefined) {
      tournamentUpdateData.location = location;
    }
    // Handle player registration if players are provided
    if (players && players.length > 0) {
      // Validate player count based on format
      if (format === "Single" && players.length !== 1) {
        throw new Error("Single format tournament allows only 1 player at a time");
      }
      
      if (format === "Pair" && players.length !== 2) {
        throw new Error("Pair format tournament requires exactly 2 players");
      }
      
      // Find or create users
      const userIds = await this.findOrCreateUsers(players);
      
      // Register based on format
      if (format === "Single") {
        const registrations = await this.registerSinglePlayers(tournamentId, userIds);
        
        // Add to tournament players array
        tournamentUpdateData.$addToSet = { players: { $each: userIds } };
        
        registrationResult = {
          type: "single",
          users: userIds,
          registrations,
        };
      } else if (format === "Pair") {
        const pair = await this.registerPairPlayers(tournamentId, players, userIds);
        
        // Add to tournament pairs array
        tournamentUpdateData.$addToSet = { pairs: pair._id };
        
        registrationResult = {
          type: "pair",
          users: userIds,
          pair,
        };
      }
    }
    
    // Handle rounds creation if provided
    if (rounds && rounds.length > 0) {
      const createdBy = registrationResult?.users?.[0] || tournament.createdBy;
      createdRounds = await this.createRounds(tournamentId, rounds, createdBy);
    }
    
    // Update tournament only if there are fields to update
    let updatedTournament = tournament;
    if (Object.keys(tournamentUpdateData).length > 0) {
      updatedTournament = await Tournament.findByIdAndUpdate(
        tournamentId,
        tournamentUpdateData,
        { new: true }
      );
    }
    
    return {
      tournament: updatedTournament,
      registration: registrationResult,
      rounds: createdRounds,
    };
  };
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
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: total,
          totalPages: Math.ceil(total / limit),
        }
      };
    } catch (error) {
      throw new Error(`Failed to fetch creator tournaments: ${error.message}`);
    }
  }

 async getTournamentMatchesService(tournamentId, page = 1, limit = 10) {
 
  if (!tournamentId) {
    throw new Error("Tournament ID is required");
  }

  // Correct query object
  const query = { tournamentId };

  const skip = (page - 1) * limit;

  // Count total matches for pagination
  const total = await Match.countDocuments(query);

  // Fetch matches
  const matches = await Match.find(query)
    .populate("player1Id player2Id", "name email photo")
    .populate("pair1Id pair2Id")
    .populate("teams.players.userId", "name email photo")
    .populate("roundId", "roundNumber name")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    success: true,
    matches,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: total,
      totalPages: Math.ceil(total / limit),
    }
  };
}


}

export default new TournamentService();