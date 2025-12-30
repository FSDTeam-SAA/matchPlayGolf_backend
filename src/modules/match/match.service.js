import Match from "./match.model.js";
import Round from "../round/round.model.js";
import Tournament from "../tournament/tournament.model.js";
import mongoose from "mongoose";
import { uploadToCloudinary } from "../../lib/uploadToCloudinary.js";
import { matchResultUpdateTemplate } from "../../lib/emailTemplates.js";
import sendEmail from '../../lib/sendEmail.js';
import User from "../user/user.model.js";

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
     if (!round || !round.tournamentId.equals(matchData.tournamentId) || round?.status == "completed") {
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

    // Handle tournamentName filter by querying Tournament collection first
    if (filters.tournamentName) {
      const tournaments = await Tournament.find({
        tournamentName: { $regex: filters.tournamentName, $options: "i" }
      }).select("_id");
      
      const tournamentIds = tournaments.map(t => t._id);
      
      if (tournamentIds.length > 0) {
        query.tournamentId = { $in: tournamentIds };
      } else {
        // No tournaments match, return empty result
        return {
          matches: [],
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: 0,
            totalPages: 0,
          }
        };
      }
    }

    // Other filters remain the same
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
      .populate({
        path: "pair1Id",
        populate: {
          path: "player1 player2",
          select: "fullName email profileImage"
        }
      })
      .populate({
        path: "pair2Id",
        populate: {
          path: "player1 player2",
          select: "fullName email profileImage"
        }
      })
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
        .populate("pair1Id", "teamName")
        .populate("pair2Id", "teamName")
  

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
  // ============================================
// SERVICE UPDATE - match.service.js
// ============================================
// async updateTournamentMatch(id, updateData, userId, role, files) {
//     try {
//       console.log("🔍 Service received files:", files); // Debug log
      
//       if (!mongoose.Types.ObjectId.isValid(id)) {
//         throw new Error("Invalid match ID");
//       }

//       const match = await Match.findById(id).populate("tournamentId");

//       if (!match) {
//         throw new Error("Match not found");
//       }
//       const token = updateData.token || null;
  
//       const isOwner =
//         match.tournamentId.createdBy.toString() === userId.toString();
//       const isAdmin = role === "Admin";
//       const ableToUpdate = token === match.verifyToken;

//       if (!isAdmin && !isOwner && !ableToUpdate) {
//         throw new Error("Not authorized to update this match");
//       }

//       if (
//         updateData.status &&
//         !["pending", "scheduled", "in-progress", "completed", "rescheduled"].includes(
//           updateData.status
//         )
//       ) {
//         throw new Error(
//           "Invalid status. Must be 'pending', 'scheduled', 'in-progress', 'completed', or 'rescheduled'"
//         );
//       }

//       // Validate matchType if provided
//       if (
//         updateData.matchType &&
//         !["Single", "Pair", "Team"].includes(updateData.matchType)
//       ) {
//         throw new Error("Invalid match type. Must be 'Single', 'Pair', or 'Team'");
//       }

//       // ✅ comments (optional)
//       if (updateData.comments !== undefined) {
//         match.comments = updateData.comments;
//       }

//       // ✅ photo uploads (single or multiple)
//       if (files && Array.isArray(files) && files.length > 0) {
//         console.log(`📸 Processing ${files.length} file(s)...`);
        
//         const uploadedPhotos = [];
        
//         for (let i = 0; i < files.length; i++) {
//           const file = files[i];
//           console.log(`⬆️ Uploading file ${i + 1}/${files.length}:`, file.originalname);
          
//           if (file && file.buffer) {
//             try {
//               const uploadResult = await uploadToCloudinary(
//                 file.buffer,
//                 file.originalname || `match_photo_${i}`,
//                 "match_photos"
//               );
              
//               if (uploadResult?.secure_url) {
//                 console.log(`✅ Upload success: ${uploadResult.secure_url}`);
//                 uploadedPhotos.push(uploadResult.secure_url);
//               }
//             } catch (uploadError) {
//               console.error(`❌ Upload failed for file ${i + 1}:`, uploadError);
//               throw new Error(`Failed to upload file ${file.originalname}: ${uploadError.message}`);
//             }
//           }
//         }
        
//         console.log(`✅ Total uploaded: ${uploadedPhotos.length} photo(s)`);
        
//         // Always store as array since model expects array
//         if (uploadedPhotos.length > 0) {
//           // Option 1: Replace all photos
//           match.matchPhoto = uploadedPhotos;
          
//           // Option 2: Append to existing photos (uncomment if you want to keep old photos)
//           // match.matchPhoto = [...(match.matchPhoto || []), ...uploadedPhotos];
          
//           console.log("💾 Saved matchPhoto:", match.matchPhoto);
//         }
//       }

//       // Apply remaining fields
//       Object.assign(match, updateData);
//       match.updatedBy = userId;
//       const savedMatch = await match.save();

//       console.log("✅ Match updated successfully");

//        await sendEmail({
//           to: user.email,
//           subject: "Match Play World Result Confirmation",
//           html: matchResultUpdateTemplate({ matchDetails, winner, score, matchReportUrl })
//         });
      
//       return await savedMatch.populate([
//         { path: "tournamentId", select: "tournamentName sportName format" },
//         { path: "roundId", select: "roundName roundNumber date" },
//         { path: "player1Id", select: "fullName email" },
//         { path: "player2Id", select: "fullName email" },
//         { path: "pair1Id", select: "pairName" },
//         { path: "pair2Id", select: "pairName" },
//         { path: "createdBy", select: "fullName email" },
//         { path: "updatedBy", select: "fullName email" }
//       ]);
//     } catch (error) {
//       console.error("❌ Service error:", error);
//       throw new Error(`Failed to update match: ${error.message}`);
//     }
//   }

async updateTournamentMatch(id, updateData, userId, role, files) {
  try {
    console.log("🔍 Service received files:", files); 

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid match ID");
    }

    // Populate match with tournament, players, and pairs
    const match = await Match.findById(id)
      .populate("tournamentId")
      .populate("roundId", "roundName roundNumber date")
      .populate("player1Id", "fullName email")
      .populate("player2Id", "fullName email")
      .populate({
        path: "pair1Id",
        populate: [
          { path: "player1", select: "fullName email" },
          { path: "player2", select: "fullName email" }
        ]
      })
      .populate({
        path: "pair2Id",
        populate: [
          { path: "player1", select: "fullName email" },
          { path: "player2", select: "fullName email" }
        ],
      })
      .populate("winner", "fullName email");

      // console.log("🔍 Fetched match for update:", match);
    if (!match) throw new Error("Match not found");

    // Authorization
    const token = updateData.token || null;
    const isOwner = match.tournamentId.createdBy.toString() === userId.toString();
    const isAdmin = role === "Admin";
    const ableToUpdate = token === match.verifyToken;

    if (!isAdmin && !isOwner && !ableToUpdate) {
      throw new Error("Not authorized to update this match");
    }

    // Validate status
    if (
      updateData.status &&
      !["pending", "scheduled", "in-progress", "completed", "rescheduled"].includes(updateData.status)
    ) throw new Error("Invalid status");

    // Validate matchType
    if (updateData.matchType && !["Single", "Pair", "Team"].includes(updateData.matchType)) {
      throw new Error("Invalid match type");
    }

    // Update comments if provided
    if (updateData.comments !== undefined) match.comments = updateData.comments;

    // Handle uploaded files
    if (files && Array.isArray(files) && files.length > 0) {
      const uploadedPhotos = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file?.buffer) {
          const uploadResult = await uploadToCloudinary(file.buffer, file.originalname || `match_photo_${i}`, "match_photos");
          if (uploadResult?.secure_url) uploadedPhotos.push(uploadResult.secure_url);
        }
      }
      if (uploadedPhotos.length > 0) match.matchPhoto = uploadedPhotos;
    }

    // Apply remaining fields
    Object.assign(match, updateData);
    match.updatedBy = userId;
    const savedMatch = await match.save(); 

    const matchDetailsWinner = await User.findById(savedMatch.winner);
    
    const playerEmails = [];

    // Single player emails
    if (savedMatch.player1Id?.email) playerEmails.push(savedMatch.player1Id.email);
    if (savedMatch.player2Id?.email) playerEmails.push(savedMatch.player2Id.email);

    // Pair match emails
    if (savedMatch.pair1Id?.player1?.email) playerEmails.push(savedMatch.pair1Id.player1.email);
    if (savedMatch.pair1Id?.player2?.email) playerEmails.push(savedMatch.pair1Id.player2.email);
    if (savedMatch.pair2Id?.player1?.email) playerEmails.push(savedMatch.pair2Id.player1.email);
    if (savedMatch.pair2Id?.player2?.email) playerEmails.push(savedMatch.pair2Id.player2.email);

    // Remove duplicates
    const uniqueEmails = [...new Set(playerEmails)];

    // Send email if there are emails
    if (uniqueEmails.length > 0) {
      await sendEmail({
        to: uniqueEmails,
        subject: `Match Result Updated: ${savedMatch.tournamentId.tournamentName}`,
        html: matchResultUpdateTemplate({
          matchDetails: {
            eventName: savedMatch.tournamentId.tournamentName,
            matchType: savedMatch.matchType,
            matchRound: savedMatch.round || "N/A",
            player1: savedMatch.player1Id.fullName,
            player2: savedMatch.player2Id.fullName,
            location: savedMatch.location,
            date: savedMatch.date,
            winner: matchDetailsWinner ? matchDetailsWinner.fullName : "N/A",
            player1Score: savedMatch.player1Score || 0,
            player2Score: savedMatch.player2Score || 0
          }
        })
      });
      console.log(`📧 Emails sent to: ${uniqueEmails.join(", ")}`);
    }

    // Populate and return final match
    return await savedMatch.populate([
      { path: "tournamentId", select: "tournamentName sportName format" },
      { path: "roundId", select: "roundName roundNumber date" },
      { path: "player1Id", select: "fullName email" },
      { path: "player2Id", select: "fullName email" },
      { path: "pair1Id", select: "pairName player1 player2" },
      { path: "pair2Id", select: "pairName player1 player2" },
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
