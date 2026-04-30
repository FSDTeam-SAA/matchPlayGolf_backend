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
      if (!["Single", "Pairs", "Team"].includes(matchData.matchType)) {
        throw new Error("Invalid match type. Must be 'Single', 'Pairs', or 'Team'");
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
      } else if (matchData.matchType === "Pairs") {
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
      } else if (matchData.matchType === "Pairs") {
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

      console.log(`🔍 Fetching match by ID: ${id}`);

      const match = await Match.findById(id)
        .populate("tournamentId", "tournamentName sportName format")
        .populate("roundId", "roundName roundNumber date")
        .populate("player1Id", "fullName email")
        .populate("player2Id", "fullName email")
        .populate("pair1Id", "teamName")
        .populate("pair2Id", "teamName")

       
       console.log(match.tournamentId._id.toString());
       const rounds = await Round.find({ tournamentId: match.tournamentId._id.toString() }).select("_id roundName roundNumber date");
  

      if (!match) {
        throw new Error("Match not found");
      }

      // Check if tournament exists
      if (!match.tournamentId) {
        console.warn(`Match ${id} has no valid tournament reference`);
      }

      return {match, rounds};
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

async updateTournamentMatch(id, updateData, userId, role, files) {
  try {

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
    if(match.tournamentId == null){
      throw new Error("Tournament not found");
    }
    if(match.tournamentId.status != "in progress"){
      throw new Error("The tournament has not started yet. You can update the match only after the tournament begins.");
    }

     const isAdmin = role === "Admin";
     const isOwner =
      role !== "token-access" &&
      match.tournamentId.createdBy.toString() === userId.toString();

    const isTokenAccess = role === "token-access";

    if (!isAdmin && !isOwner && !isTokenAccess) {
      throw new Error("Not authorized to update this match");
    }

    // Validate status
    if (
      updateData.status &&
      !["pending", "scheduled", "in-progress", "completed", "rescheduled"].includes(updateData.status)
    ) throw new Error("Invalid status");

    // Validate matchType
    if (updateData.matchType && !["Single", "Pairs", "Team"].includes(updateData.matchType)) {
      throw new Error("Invalid match type");
    }

    if (updateData.comments !== undefined) match.comments = updateData.comments;

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

    Object.assign(match, updateData);
    match.updatedBy = userId;
    const savedMatch = await match.save(); 

    const matchDetailsWinner = await User.findById(savedMatch.winner);
    
    const playerEmails = [];

    if (savedMatch.player1Id?.email) playerEmails.push(savedMatch.player1Id.email);
    if (savedMatch.player2Id?.email) playerEmails.push(savedMatch.player2Id.email);
    if (savedMatch.pair1Id?.player1?.email) playerEmails.push(savedMatch.pair1Id.player1.email);
    if (savedMatch.pair1Id?.player2?.email) playerEmails.push(savedMatch.pair1Id.player2.email);
    if (savedMatch.pair2Id?.player1?.email) playerEmails.push(savedMatch.pair2Id.player1.email);
    if (savedMatch.pair2Id?.player2?.email) playerEmails.push(savedMatch.pair2Id.player2.email);

    const uniqueEmails = [...new Set(playerEmails)];
    const matchDetails = {
        eventName: savedMatch.tournamentId.tournamentName,
        matchType: savedMatch.matchType,
        matchRound: savedMatch.round || "N/A",
        location: savedMatch.location,
        date: savedMatch.date,
        winner: matchDetailsWinner?.fullName || "N/A",
      };

      if (savedMatch.matchType === "Single") {
        matchDetails.player1 = savedMatch.player1Id?.fullName || "N/A";
        matchDetails.player2 = savedMatch.player2Id?.fullName || "N/A";
        matchDetails.player1Score = savedMatch.player1Score || 0;
        matchDetails.player2Score = savedMatch.player2Score || 0;
      }

      if (savedMatch.matchType === "Pairs") {
        matchDetails.player1 = savedMatch.pair1Id
          ? `${savedMatch.pair1Id.player1?.fullName || "N/A"} & ${savedMatch.pair1Id.player2?.fullName || "N/A"}`
          : "N/A";

        matchDetails.player2 = savedMatch.pair2Id
          ? `${savedMatch.pair2Id.player1?.fullName || "N/A"} & ${savedMatch.pair2Id.player2?.fullName || "N/A"}`
          : "N/A";

        matchDetails.player1Score = savedMatch.pair1Score || 0;
        matchDetails.player2Score = savedMatch.pair2Score || 0;
      }

    // if (uniqueEmails.length > 0) {
    //   await sendEmail({
    //     to: uniqueEmails,
    //     subject: `Match Result Updated: ${savedMatch.tournamentId.tournamentName}`,
    //     html: matchResultUpdateTemplate({ matchDetails })
    //   });
    //   // console.log(`📧 Emails sent to: ${uniqueEmails.join(", ")}`);
    // }

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
      const isAdmin = role === "Admin";

      if (!isOwner && !isAdmin) {
        throw new Error("Not authorized to delete this match");
      }

      await match.deleteOne();

      return { message: "Match deleted successfully" };
    } catch (error) {
      throw new Error(`Failed to delete match: ${error.message}`);
    }
  }
  // swapMatchPlayers.service.js

  // async swapMatchPlayers(match1Id, match2Id, updateData, userId, role) {
  //   try {
  //     // Validate IDs
  //     if (!mongoose.Types.ObjectId.isValid(match1Id) || !mongoose.Types.ObjectId.isValid(match2Id)) {
  //       throw new Error("Invalid match ID(s)");
  //     }

  //     if (match1Id === match2Id) {
  //       throw new Error("Cannot swap players within the same match");
  //     }

  //     console.log(updateData);

  //     // Fetch both matches
  //     const [match1, match2] = await Promise.all([
  //       Match.findById(match1Id).populate("tournamentId"),
  //       Match.findById(match2Id).populate("tournamentId"),
  //     ]);

  //     if (!match1) throw new Error("Match 1 not found");
  //     if (!match2) throw new Error("Match 2 not found");

  //     // Both matches must belong to same tournament
  //     if (match1.tournamentId._id.toString() !== match2.tournamentId._id.toString()) {
  //       throw new Error("Matches must belong to the same tournament");
  //     }

  //     // Authorization
  //     const isAdmin = role === "Admin";
  //     const isOwner =
  //       role !== "token-access" &&
  //       match1.tournamentId.createdBy.toString() === userId.toString();
  //     const isTokenAccess = role === "token-access";

  //     if (!isAdmin && !isOwner && !isTokenAccess) {
  //       throw new Error("Not authorized to update these matches");
  //     }

  //     // Completed matches cannot be swapped
  //     if (match1.status === "completed" || match2.status === "completed") {
  //       throw new Error("Cannot swap players in completed matches");
  //     }

  //     const matchType = match1.matchType;
  //     if (match1.matchType !== match2.matchType) {
  //       throw new Error("Both matches must have the same match type");
  //     }

  //     // ─────────────────────────────────────────
  //     // SINGLE match type swap
  //     // ─────────────────────────────────────────
  //     if (matchType === "Single") {
  //       const { match1Slot, newPlayerId } = updateData;
  //       // match1Slot: "player1Id" or "player2Id"
  //       // newPlayerId: the player from match2 you want to move to match1

  //       if (!match1Slot || !newPlayerId) {
  //         throw new Error("match1Slot and newPlayerId are required for Single type");
  //       }

  //       if (!["player1Id", "player2Id"].includes(match1Slot)) {
  //         throw new Error("match1Slot must be 'player1Id' or 'player2Id'");
  //       }

  //       // Find which slot newPlayerId occupies in match2
  //       const match2Slot = match2.player1Id?.toString() === newPlayerId
  //         ? "player1Id"
  //         : match2.player2Id?.toString() === newPlayerId
  //         ? "player2Id"
  //         : null;

  //       if (!match2Slot) {
  //         throw new Error("newPlayerId not found in match2");
  //       }

  //       // The displaced player from match1 goes to match2
  //       const displacedPlayerId = match1[match1Slot];

  //       // Perform swap
  //       match1[match1Slot] = new mongoose.Types.ObjectId(newPlayerId);
  //       match2[match2Slot] = displacedPlayerId;
  //     }

  //     // ─────────────────────────────────────────
  //     // PAIR match type swap
  //     // ─────────────────────────────────────────
  //     else if (matchType === "Pair") {
  //       const { match1Slot, newPairId } = updateData;
  //       // match1Slot: "pair1Id" or "pair2Id"
  //       // newPairId: the pair from match2 you want to move to match1

  //       if (!match1Slot || !newPairId) {
  //         throw new Error("match1Slot and newPairId are required for Pair type");
  //       }

  //       if (!["pair1Id", "pair2Id"].includes(match1Slot)) {
  //         throw new Error("match1Slot must be 'pair1Id' or 'pair2Id'");
  //       }

  //       // Find which slot newPairId occupies in match2
  //       const match2Slot = match2.pair1Id?.toString() === newPairId
  //         ? "pair1Id"
  //         : match2.pair2Id?.toString() === newPairId
  //         ? "pair2Id"
  //         : null;

  //       if (!match2Slot) {
  //         throw new Error("newPairId not found in match2");
  //       }

  //       // The displaced pair from match1 goes to match2
  //       const displacedPairId = match1[match1Slot];

  //       // Perform swap
  //       match1[match1Slot] = new mongoose.Types.ObjectId(newPairId);
  //       match2[match2Slot] = displacedPairId;
  //     }

  //     else {
  //       throw new Error("Swap is only supported for Single and Pair match types");
  //     }

  //     // Update metadata
  //     match1.updatedBy = userId;
  //     match2.updatedBy = userId;

  //     // Save both atomically
  //     await Promise.all([match1.save(), match2.save()]);

  //     // Return both updated matches populated
  //     const populate = [
  //       { path: "tournamentId", select: "tournamentName sportName format" },
  //       { path: "roundId", select: "roundName roundNumber date" },
  //       { path: "player1Id", select: "fullName email" },
  //       { path: "player2Id", select: "fullName email" },
  //       { path: "pair1Id", populate: [{ path: "player1", select: "fullName email" }, { path: "player2", select: "fullName email" }] },
  //       { path: "pair2Id", populate: [{ path: "player1", select: "fullName email" }, { path: "player2", select: "fullName email" }] },
  //       { path: "updatedBy", select: "fullName email" },
  //     ];

  //     const [updatedMatch1, updatedMatch2] = await Promise.all([
  //       match1.populate(populate),
  //       match2.populate(populate),
  //     ]);

  //     return { match1: updatedMatch1, match2: updatedMatch2 };

  //   } catch (error) {
  //     console.error("❌ Swap service error:", error);
  //     throw new Error(`Failed to swap match players: ${error.message}`);
  //   }
  //   }

//   async swapMatchPlayers(match1Id, match2Id, updateData, userId, role) {
//   try {
//     if (!mongoose.Types.ObjectId.isValid(match1Id) || !mongoose.Types.ObjectId.isValid(match2Id)) {
//       throw new Error("Invalid match ID(s)");
//     }

//     if (match1Id === match2Id) {
//       throw new Error("Cannot swap players within the same match");
//     }

//     const [match1, match2] = await Promise.all([
//       await Match.findById(match1Id).populate("tournamentId"),
//       await Match.findById(match2Id).populate("tournamentId"),
//     ]);

//     if (!match1) throw new Error("Match 1 not found");
//     if (!match2) throw new Error("Match 2 not found");

//     if (match1.tournamentId._id.toString() !== match2.tournamentId._id.toString()) {
//       throw new Error("Matches must belong to the same tournament");
//     }

//     const isAdmin = role === "Admin";
//     const isOwner =
//       role !== "token-access" &&
//       match1.tournamentId.createdBy.toString() === userId.toString();
//     const isTokenAccess = role === "token-access";

//     if (!isAdmin && !isOwner && !isTokenAccess) {
//       throw new Error("Not authorized to update these matches");
//     }

//     if (match1.status === "completed" || match2.status === "completed") {
//       throw new Error("Cannot swap players in completed matches");
//     }

//     if (match1.matchType !== match2.matchType) {
//       throw new Error("Both matches must have the same match type");
//     }

//     const matchType = match1.matchType;
//     const { player1Id, player2Id, pair1Id, pair2Id } = updateData;

//     // ─────────────────────────────────────────
//     // SINGLE: player1Id = new player for match1 slot1
//     //         player2Id = new player for match1 slot2
//     // ─────────────────────────────────────────
//     if (matchType === "Single") {
//       if (!player1Id && !player2Id) {
//         throw new Error("At least player1Id or player2Id is required for Single type");
//       }

//       // Swap player1 slot
//       if (player1Id) {
//         // Find where player1Id sits in match2
//         console.log("🔍 Swapping player1Id:", player1Id, match2);
//         const match2Slot =
//           match2.player1Id?.toString() === player1Id ? "player1Id" :
//           match2.player2Id?.toString() === player1Id ? "player2Id" : null;

//         if (!match2Slot) throw new Error("player1Id not found in match2");

//         const displaced = match1.player1Id;
//         match1.player1Id = new mongoose.Types.ObjectId(player1Id);
//         match2[match2Slot] = displaced;
//       }

//       // Swap player2 slot
//       if (player2Id) {
//         console.log("🔍 Swapping player2Id:", player2Id);
//         const match2Slot =
//           match2.player1Id?.toString() === player2Id ? "player1Id" :
//           match2.player2Id?.toString() === player2Id ? "player2Id" : null;

//         if (!match2Slot) throw new Error("player2Id not found in match2");

//         const displaced = match1.player2Id;
//         match1.player2Id = new mongoose.Types.ObjectId(player2Id);
//         match2[match2Slot] = displaced;
//       }
//     }

//     // ─────────────────────────────────────────
//     // PAIR: pair1Id = new pair for match1 slot1
//     //       pair2Id = new pair for match1 slot2
//     // ─────────────────────────────────────────
//     else if (matchType === "Pair") {
//       if (!pair1Id && !pair2Id) {
//         throw new Error("At least pair1Id or pair2Id is required for Pair type");
//       }

//       if (pair1Id) {
//         const match2Slot =
//           match2.pair1Id?.toString() === pair1Id ? "pair1Id" :
//           match2.pair2Id?.toString() === pair1Id ? "pair2Id" : null;

//         if (!match2Slot) throw new Error("pair1Id not found in match2");

//         const displaced = match1.pair1Id;
//         match1.pair1Id = new mongoose.Types.ObjectId(pair1Id);
//         match2[match2Slot] = displaced;
//       }

//       if (pair2Id) {
//         const match2Slot =
//           match2.pair1Id?.toString() === pair2Id ? "pair1Id" :
//           match2.pair2Id?.toString() === pair2Id ? "pair2Id" : null;

//         if (!match2Slot) throw new Error("pair2Id not found in match2");

//         const displaced = match1.pair2Id;
//         match1.pair2Id = new mongoose.Types.ObjectId(pair2Id);
//         match2[match2Slot] = displaced;
//       }
//     }

//     else {
//       throw new Error("Swap is only supported for Single and Pair match types");
//     }

//     match1.updatedBy = userId;
//     match2.updatedBy = userId;

//     await Promise.all([match1.save(), match2.save()]);

//     const populate = [
//       { path: "tournamentId", select: "tournamentName sportName format" },
//       { path: "roundId", select: "roundName roundNumber date" },
//       { path: "player1Id", select: "fullName email" },
//       { path: "player2Id", select: "fullName email" },
//       {
//         path: "pair1Id",
//         populate: [
//           { path: "player1", select: "fullName email" },
//           { path: "player2", select: "fullName email" },
//         ],
//       },
//       {
//         path: "pair2Id",
//         populate: [
//           { path: "player1", select: "fullName email" },
//           { path: "player2", select: "fullName email" },
//         ],
//       },
//       { path: "updatedBy", select: "fullName email" },
//     ];

//     const [updatedMatch1, updatedMatch2] = await Promise.all([
//       match1.populate(populate),
//       match2.populate(populate),
//     ]);

//     return { match1: updatedMatch1, match2: updatedMatch2 };

//   } catch (error) {
//     console.error("❌ Swap service error:", error);
//     throw new Error(`Failed to swap match players: ${error.message}`);
//   }
// }
async swapMatchPlayers(match1Id, match2Id, updateData, userId, role) {
  try {
    if (!mongoose.Types.ObjectId.isValid(match1Id) || !mongoose.Types.ObjectId.isValid(match2Id)) {
      throw new Error("Invalid match ID(s)");
    }

    if (match1Id.toString() === match2Id.toString()) {
      throw new Error("Cannot swap players within the same match");
    }

    const [match1, match2] = await Promise.all([
      Match.findById(match1Id).populate("tournamentId"),
      Match.findById(match2Id).populate("tournamentId"),
    ]);

    if (!match1) throw new Error("Match 1 not found");
    if (!match2) throw new Error("Match 2 not found");

    if (match1.tournamentId._id.toString() !== match2.tournamentId._id.toString()) {
      throw new Error("Matches must belong to the same tournament");
    }

    const isAdmin = role === "Admin";
    const isOwner =
      role !== "token-access" &&
      match1.tournamentId.createdBy.toString() === userId.toString();
    const isTokenAccess = role === "token-access";

    if (!isAdmin && !isOwner && !isTokenAccess) {
      throw new Error("Not authorized to update these matches");
    }

    if (match1.status === "completed" || match2.status === "completed") {
      throw new Error("Cannot swap players in completed matches");
    }

    if (match1.matchType !== match2.matchType) {
      throw new Error("Both matches must have the same match type");
    }

    const matchType = match1.matchType;
    const { match1Slot, match2Slot } = updateData;
    // match1Slot: which slot in match1 to swap  e.g. "player1Id" or "player2Id"
    // match2Slot: which slot in match2 to swap  e.g. "player1Id" or "player2Id"

    if (matchType === "Single" || matchType === "Team") {
      if (!match1Slot || !match2Slot) {
        throw new Error("match1Slot and match2Slot are required");
      }

      if (!["player1Id", "player2Id"].includes(match1Slot)) {
        throw new Error("match1Slot must be 'player1Id' or 'player2Id'");
      }

      if (!["player1Id", "player2Id"].includes(match2Slot)) {
        throw new Error("match2Slot must be 'player1Id' or 'player2Id'");
      }

      // console.log(`🔁 Swapping match1.${match1Slot} (${match1[match1Slot]}) with match2.${match2Slot} (${match2[match2Slot]})`);

      // Direct slot swap
      const temp = match1[match1Slot];
      match1[match1Slot] = match2[match2Slot];
      match2[match2Slot] = temp;

    } else if (matchType === "Pairs") {
      if (!match1Slot || !match2Slot) {
        throw new Error("match1Slot and match2Slot are required");
      }

      if (!["pair1Id", "pair2Id"].includes(match1Slot)) {
        throw new Error("match1Slot must be 'pair1Id' or 'pair2Id'");
      }

      if (!["pair1Id", "pair2Id"].includes(match2Slot)) {
        throw new Error("match2Slot must be 'pair1Id' or 'pair2Id'");
      }

      // console.log(`🔁 Swapping match1.${match1Slot} (${match1[match1Slot]}) with match2.${match2Slot} (${match2[match2Slot]})`);

      // Direct slot swap
      const temp = match1[match1Slot];
      match1[match1Slot] = match2[match2Slot];
      match2[match2Slot] = temp;

    } else {
      throw new Error("Swap is only supported for Single, Pairs, and Team match types");
    }

    match1.updatedBy = userId;
    match2.updatedBy = userId;

    await Promise.all([match1.save(), match2.save()]);

    const populate = [
      { path: "tournamentId", select: "tournamentName sportName format" },
      { path: "roundId", select: "roundName roundNumber date" },
      { path: "player1Id", select: "fullName email" },
      { path: "player2Id", select: "fullName email" },
      {
        path: "pair1Id",
        populate: [
          { path: "player1", select: "fullName email" },
          { path: "player2", select: "fullName email" },
        ],
      },
      {
        path: "pair2Id",
        populate: [
          { path: "player1", select: "fullName email" },
          { path: "player2", select: "fullName email" },
        ],
      },
      { path: "updatedBy", select: "fullName email" },
    ];

    const [updatedMatch1, updatedMatch2] = await Promise.all([
      match1.populate(populate),
      match2.populate(populate),
    ]);

    return { match1: updatedMatch1, match2: updatedMatch2 };

  } catch (error) {
    console.error("❌ Swap service error:", error);
    throw new Error(`Failed to swap match players: ${error.message}`);
  }
}
}

export default new MatchService();
