import Match from "./match.model.js";
import Round from "../round/round.model.js";
import Tournament from "../tournament/tournament.model.js";
import mongoose from "mongoose";
import { uploadToCloudinary } from "../../lib/uploadToCloudinary.js";

class MatchService {
  /**
   * Create a new match
   */
  async createTournamentMatch(matchData) {
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

      // Validate matchType (case-sensitive)
      if (!["Single", "Pair", "Team"].includes(matchData.matchType)) {
        throw new Error("Invalid match type. Must be 'Single', 'Pair', or 'Team'");
      }

      // Validate required fields based on matchType
      if (matchData.matchType === "Single" || matchData.matchType === "Team") {
        if (!matchData.player1Id || !matchData.player2Id) {
          throw new Error("Single match requires both player1Id and player2Id");
        }
        // Validate player IDs
        if (
          !mongoose.Types.ObjectId.isValid(matchData.player1Id) ||
          !mongoose.Types.ObjectId.isValid(matchData.player2Id)
        ) {
          throw new Error("Invalid player ID");
        }
      } else if (matchData.matchType === "Pair") {
        if (!matchData.pair1Id || !matchData.pair2Id) {
          throw new Error("Pair match requires both pair1Id and pair2Id");
        }
        // Validate pair IDs
        if (
          !mongoose.Types.ObjectId.isValid(matchData.pair1Id) ||
          !mongoose.Types.ObjectId.isValid(matchData.pair2Id)
        ) {
          throw new Error("Invalid pair ID");
        }
      }

      const match = await Match.create(matchData);

      // Populate based on match type
      const populateFields = [
        { path: "tournamentId", select: "tournamentName sportName format" },
        { path: "roundId", select: "roundName roundNumber date" },
        { path: "createdBy", select: "fullName email" },
      ];

      if (matchData.matchType === "Single" || matchData.matchType === "Team") {
        populateFields.push(
          { path: "player1Id", select: "fullName email" },
          { path: "player2Id", select: "fullName email" }
        );
      } else if (matchData.matchType === "Pair") {
        populateFields.push(
          { path: "pair1Id", select: "pairName" },
          { path: "pair2Id", select: "pairName" }
        );
      }

      const populatedMatch = await match.populate(populateFields);

      return populatedMatch;
    } catch (error) {
      throw new Error(`Failed to create match: ${error.message}`);
    }
  }

  /**
   * Get all matches with filters and pagination
   */
  async getAllTournamentMatches(filters = {}, page = 1, limit = 10) {
    try {
      const query = {};

      if (filters.tournamentName) {
        query.tournamentName = { $regex: filters.tournamentName, $options: "i" };
      }

      if (filters.roundName) {
        query.roundName = { $regex: filters.roundName, $options: "i" };
      }

      if (filters.matchType) {
        query.matchType = { $regex: filters.matchType, $options: "i" };
      }

      if (filters.status) {
        query.status = { $regex: filters.status, $options: "i" };
      }
      if (filters.tournamentId) {
        query.tournamentId = filters.tournamentId;
      }

      const skip = (page - 1) * limit;
      const total = await Match.countDocuments(query);

      const matches = await Match.find(query)
        .populate("tournamentId", "tournamentName sportName format")
        .populate("roundId", "roundName roundNumber date")
        .populate("player1Id", "fullName email")
        .populate("player2Id", "fullName email")
        .populate("pair1Id", "pairName")
        .populate("pair2Id", "pairName")
        .populate("players.userId", "fullName email") // For stats
        .populate("teams.players.userId", "fullName email") // For stats
        .populate("createdBy", "fullName email")
        .sort({ teeTime: 1 })
        .skip(skip)
        .limit(limit);

      return {
        matches,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: total,
          totalPages: Math.ceil(total / limit),
        }
      };
    } catch (error) {
      throw new Error(`Failed to fetch matches: ${error.message}`);
    }
  }

  // async getAllTournamentMatches(filters = {}, page = 1, limit = 10) {
  //   const query = {};

  //   if (filters.tournamentId) query.tournamentId = filters.tournamentId;
  //   if (filters.matchType) query.matchType = filters.matchType;
  //   if (filters.status) query.status = filters.status;

  //   const skip = (page - 1) * limit;
  //   const total = await Match.countDocuments(query);

  //   const matches = await Match.find(query)
  //     .populate({
  //       path: "tournamentId",
  //       select: "tournamentName sportName format",
  //       model: "Tournament",
  //     })
  //     .populate("roundId", "roundName roundNumber date")
  //     .populate("player1Id", "fullName email")
  //     .populate("player2Id", "fullName email")
  //     .populate("pair1Id", "pairName")
  //     .populate("pair2Id", "pairName")
  //     .populate("players.userId", "fullName email")
  //     .populate("teams.players.userId", "fullName email")
  //     .populate("createdBy", "fullName email")
  //     .sort({ teeTime: 1 })
  //     .skip(skip)
  //     .limit(limit);

  //   return {
  //     matches,
  //     pagination: {
  //       page: Number(page),
  //       limit: Number(limit),
  //       total: total,
  //       totalPages: Math.ceil(total / limit),
  //     },
  //   };
  // }

  /**
   * Get match by ID
   */
  async getTournamentMatchById(id) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid match ID");
      }

      const match = await Match.findById(id)
        .populate("tournamentId", "tournamentName sportName format")
        .populate("roundId", "roundName roundNumber date")
        .populate("player1Id", "fullName email")
        .populate("player2Id", "fullName email")
        .populate("pair1Id", "pairName")
        .populate("pair2Id", "pairName")
        .populate("players.userId", "fullName email")
        .populate("teams.players.userId", "fullName email")
        .populate("createdBy", "fullName email")
        .populate("updatedBy", "fullName email");

      if (!match) {
        throw new Error("Match not found");
      }

      // Check if tournament exists
      if (!match.tournamentId) {
        console.warn(`Match ${id} has no valid tournament reference`);
      }

      return match;
    } catch (error) {
      throw new Error(`Failed to fetch match: ${error.message}`);
    }
  }
  /**
   * Get matches by round
   */
  async getTournamentMatchesByRound(roundId, page = 1, limit = 10) {
    try {
      if (!mongoose.Types.ObjectId.isValid(roundId)) {
        throw new Error("Invalid round ID");
      }

      const query = { roundId };
      const skip = (page - 1) * limit;
      const total = await Match.countDocuments(query);

      const matches = await Match.find(query)
        .populate("tournamentId", "tournamentName sportName format")
        .populate("player1Id", "fullName email")
        .populate("player2Id", "fullName email")
        .populate("pair1Id", "pairName")
        .populate("pair2Id", "pairName")
        .populate("players.userId", "fullName email") // For stats
        .populate("teams.players.userId", "fullName email") // For stats
        .populate("createdBy", "fullName email")
        .sort({ teeTime: 1, groupNumber: 1 })
        .skip(skip)
        .limit(limit);

      return {
        matches,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Failed to fetch round matches: ${error.message}`);
    }
  }

  /**
   * Update match
   */
   /**
   * Update match
   */
  // async updateTournamentMatch(id, updateData, userId, role, file) {
  //   try {
  //     if (!mongoose.Types.ObjectId.isValid(id)) {
  //       throw new Error("Invalid match ID");
  //     }

  //     const match = await Match.findById(id).populate("tournamentId");

  //     if (!match) {
  //       throw new Error("Match not found");
  //     }

  //     // Check authorization
  //     const isOwner =
  //       match.tournamentId.createdBy.toString() === userId.toString();
  //     const isAdmin = role === "admin";

  //     if (!isAdmin && !isOwner) {
  //       throw new Error("Not authorized to update this match");
  //     }

  //     // Validate status if provided (match schema enum)
  //     if (
  //       updateData.status &&
  //       !["Upcoming", "In Progress", "Completed", "Cancelled"].includes(
  //         updateData.status
  //       )
  //     ) {
  //       throw new Error(
  //         "Invalid status. Must be 'Upcoming', 'In Progress', 'Completed', or 'Cancelled'"
  //       );
  //     }

  //     // Validate matchType if provided
  //     if (
  //       updateData.matchType &&
  //       !["Single", "Pair"].includes(updateData.matchType)
  //     ) {
  //       throw new Error("Invalid match type. Must be 'Single' or 'Pair'");
  //     }
      
  //     // if (updateData.status === "Completed" || match.status === "Completed") {
  
  //     // // Single Match Winner Color Logic
  //     // if (match.matchType === "Single") {
  //     //   if (updateData.winnerPlayerId?.toString() === match.player1Id?.toString()) {
  //     //     match.player1Color = "#39674b"; // Winner
  //     //   } else if (updateData.winnerPlayerId?.toString() === match.player2Id?.toString()) {
  //     //     match.player2Color = "#39674b"; // Winner
  //     //   }
  //     // }

  //     // // Pair Match Winner Color Logic
  //     // if (match.matchType === "Pair") {
  //     //   if (updateData.winnerPairId?.toString() === match.pair1Id?.toString()) {
  //     //     match.pair1Color = "#39674b"; // Winner
  //     //   } else if (updateData.winnerPairId?.toString() === match.pair2Id?.toString()) {
  //     //     match.pair2Color = "#39674b"; // Winner
  //     //   }
  //     // }
  //   // }

  //     // ✅ comments (optional)
  //     if (updateData.comments !== undefined) {
  //       match.comments = updateData.comments;
  //     }

  //     // ✅ photo upload (optional)
  //     if (file && file.buffer) {
  //       const uploadResult = await uploadToCloudinary(
  //         file.buffer,
  //         file.originalname || "match_photo",
  //         "match_photos"
  //       );
  //       if (uploadResult?.secure_url) {
  //         match.matchPhoto = uploadResult.secure_url;
  //       }
  //     }

  //     // Apply remaining fields (score, status, teeTime, etc.)
  //     Object.assign(match, updateData);
  //     match.updatedBy = userId;
  //     const savedMatch = await match.save();

  //     console.log("Updated Match:", savedMatch);
  //     return await savedMatch.populate([
  //       { path: "tournamentId", select: "tournamentName sportName format" },
  //       { path: "roundId", select: "roundName roundNumber date" },
  //       { path: "player1Id", select: "fullName email" },
  //       { path: "player2Id", select: "fullName email" },
  //       { path: "pair1Id", select: "pairName" },
  //       { path: "pair2Id", select: "pairName" },
  //       // { path: "players.userId", select: "fullName email" },
  //       // { path: "teams.players.userId", select: "fullName email" },
  //       { path: "createdBy", select: "fullName email" },
  //       { path: "updatedBy", select: "fullName email" }
  //     ]);
  //   } catch (error) {
  //     throw new Error(`Failed to update match: ${error.message}`);
  //   }
  // }
  // ============================================
// SERVICE UPDATE - match.service.js
// ============================================
async updateTournamentMatch(id, updateData, userId, role, files) {
    try {
      console.log("🔍 Service received files:", files); // Debug log
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid match ID");
      }

      const match = await Match.findById(id).populate("tournamentId");

      if (!match) {
        throw new Error("Match not found");
      }

      // Check authorization
      const isOwner =
        match.tournamentId.createdBy.toString() === userId.toString();
      const isAdmin = role === "admin";

      if (!isAdmin && !isOwner) {
        throw new Error("Not authorized to update this match");
      }

      // Validate status if provided
      if (
        updateData.status &&
        !["pending", "scheduled", "in-progress", "completed", "rescheduled"].includes(
          updateData.status
        )
      ) {
        throw new Error(
          "Invalid status. Must be 'pending', 'scheduled', 'in-progress', 'completed', or 'rescheduled'"
        );
      }

      // Validate matchType if provided
      if (
        updateData.matchType &&
        !["Single", "Pair", "Team"].includes(updateData.matchType)
      ) {
        throw new Error("Invalid match type. Must be 'Single', 'Pair', or 'Team'");
      }

      // ✅ comments (optional)
      if (updateData.comments !== undefined) {
        match.comments = updateData.comments;
      }

      // ✅ photo uploads (single or multiple)
      if (files && Array.isArray(files) && files.length > 0) {
        console.log(`📸 Processing ${files.length} file(s)...`);
        
        const uploadedPhotos = [];
        
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          console.log(`⬆️ Uploading file ${i + 1}/${files.length}:`, file.originalname);
          
          if (file && file.buffer) {
            try {
              const uploadResult = await uploadToCloudinary(
                file.buffer,
                file.originalname || `match_photo_${i}`,
                "match_photos"
              );
              
              if (uploadResult?.secure_url) {
                console.log(`✅ Upload success: ${uploadResult.secure_url}`);
                uploadedPhotos.push(uploadResult.secure_url);
              }
            } catch (uploadError) {
              console.error(`❌ Upload failed for file ${i + 1}:`, uploadError);
              throw new Error(`Failed to upload file ${file.originalname}: ${uploadError.message}`);
            }
          }
        }
        
        console.log(`✅ Total uploaded: ${uploadedPhotos.length} photo(s)`);
        
        // Always store as array since model expects array
        if (uploadedPhotos.length > 0) {
          // Option 1: Replace all photos
          match.matchPhoto = uploadedPhotos;
          
          // Option 2: Append to existing photos (uncomment if you want to keep old photos)
          // match.matchPhoto = [...(match.matchPhoto || []), ...uploadedPhotos];
          
          console.log("💾 Saved matchPhoto:", match.matchPhoto);
        }
      }

      // Apply remaining fields
      Object.assign(match, updateData);
      match.updatedBy = userId;
      const savedMatch = await match.save();

      console.log("✅ Match updated successfully");
      return await savedMatch.populate([
        { path: "tournamentId", select: "tournamentName sportName format" },
        { path: "roundId", select: "roundName roundNumber date" },
        { path: "player1Id", select: "fullName email" },
        { path: "player2Id", select: "fullName email" },
        { path: "pair1Id", select: "pairName" },
        { path: "pair2Id", select: "pairName" },
        { path: "createdBy", select: "fullName email" },
        { path: "updatedBy", select: "fullName email" }
      ]);
    } catch (error) {
      console.error("❌ Service error:", error);
      throw new Error(`Failed to update match: ${error.message}`);
    }
  }
  /**
   * Update match scores
   */
  async updateTournamentMatchScores(id, scoresData, userId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid match ID");
      }

      const match = await Match.findById(id);

      if (!match) {
        throw new Error("Match not found");
      }

      // Update scores based on match type (case-sensitive)
      if (match.matchType === "Single" && scoresData.players || match.matchType === "Team" && scoresData.teams) {
        match.players = scoresData.players;
      } else if (match.matchType === "Pair" && scoresData.teams) {
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
        { path: "player1Id", select: "fullName email" },
        { path: "player2Id", select: "fullName email" },
        { path: "pair1Id", select: "pairName" },
        { path: "pair2Id", select: "pairName" },
      ]);
    } catch (error) {
      throw new Error(`Failed to update match scores: ${error.message}`);
    }
  }

  /**
   * Delete match
   */
  async deleteTournamentMatch(id, userId, role) {
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
