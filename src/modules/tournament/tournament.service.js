import Tournament from "./tournament.model.js";
import mongoose from "mongoose";
import { createCheckoutSession } from "../payment/payment.controller.js";
import User from "../user/user.model.js";
import TournamentPair from "../others/tournamentPair.model.js";
import TournamentPlayer from "../others/tournamentPlayer.model.js";
import Round from "../round/round.model.js";
import Match from "../match/match.model.js";
import crypto from "crypto";
import { welcomeEmailTemplate } from "../../lib/emailTemplates.js";
import sendEmail from '../../lib/sendEmail.js';
import AppError from "../../middleware/errorHandler.js";

class TournamentService {

  async createTournament(tournamentData) {
    try {
      console.log(tournamentData);
      const tournament = await Tournament.create(tournamentData);
      let payment = {};

      if(tournamentData.role === "Organizer"){
          payment = await createCheckoutSession(
            tournament.price,                                
            tournament.billingAddress?.email,               
            tournament._id,                                 
            tournament.tournamentName,                       
            tournament.createdBy                           
          );

      }

      const tournamentDetails = await tournament.populate(
        "createdBy",
        "fullName email role"
      );

      return {tournamentDetails, payment};
    } catch (error) {
      throw new AppError(400, false, `Failed to create tournament: ${error.message}`);
    }
  }

  async getAllTournaments(filters = {}, page = 1, limit = 10) {
  try {
    const query = {};

    if (filters.sportName) {
      query.sportName = { $regex: filters.sportName, $options: "i" };
    }
    if (filters.drawFormat) {
      query.drawFormat = filters.drawFormat;
    }
    if (filters.format) {
      query.format = { $regex: filters.format, $options: "i" };
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

    const tournaments = await Tournament.find(query)
      .populate("createdBy", "fullName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

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

  async getTournamentById(id) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid tournament ID");
      }

      const tournament = await Tournament.findById(id)
      .populate("createdBy", "fullName email role");

      const rounds = await Round.find({ tournamentId: id }).sort({ roundNumber: 1 });

      if (!tournament) {
        throw new Error("Tournament not found");
      }

      return { tournament, rounds };
    } catch (error) {
      throw new Error(`Failed to fetch tournament: ${error.message}`);
    }
  }
async findOrCreateUsers(players) {
  const userIds = [];
  
  for (const player of players) {
    
    if (!player.email) {
      throw new Error("Player email is required");
    }
    
    let user = await User.findOne({ email: player.email });
    console.log("Found user:", user);
    if (!user) {

      const verifyToken = generateToken();
      user = await User.create({
        fullName: player.fullName,
        email: player.email,
        phone: player.phone,
        captainName:player.captainName || null,
        verifyToken
      });
      console.log("Created new user:", user);
      try {
        await sendEmail({
          to: user.email,
          subject: "Welcome to GolfKO",
          html: welcomeEmailTemplate({ user, verifyToken })
        });
        console.log(`Welcome email sent to ${user.email}`);
      } catch (emailError) {
        console.error(`Failed to send welcome email to ${user.email}:`, emailError);
      }
    }
    
    userIds.push(user._id);
  }
  
  return userIds;
}

async registerSinglePlayers(tournamentId, userIds) {
  const registrations = [];
  console.log("Registering single players:", userIds);
  
  const existingRegistrations = await TournamentPlayer.find({
    tournamentId,
    playerId: { $in: userIds },
  });
  
  const existingPlayerIds = new Set(
    existingRegistrations.map(reg => reg.playerId.toString())
  );
  
  const newUserIds = userIds.filter(
    userId => !existingPlayerIds.has(userId.toString())
  );
  
  const tournament = await Tournament.findById(tournamentId);

  if (!tournament) {
    throw new Error("Tournament not found");
  }

  if (!Array.isArray(newUserIds)) {
    throw new Error("newUserIds must be an array");
  }

  const totalAfterAdd =
    Number(tournament.totalParticipants) + newUserIds.length;

  console.log(newUserIds.length, "dfastgdtyuhre5rt erfs");
  if (totalAfterAdd > Number(tournament.drawSize)) {
    throw new Error("Participant size exceeds tournament draw size");
  }

  if (newUserIds.length > 0) {
    const newRegistrations = newUserIds.map(userId => ({
      tournamentId,
      playerId: userId,
      pairId: null,
    }));
    
    const inserted = await TournamentPlayer.insertMany(newRegistrations);
    registrations.push(...inserted);
  }

  return { 
    registrations, 
    count: newUserIds.length 
  };
}

async registerPairPlayers(tournamentId, players, userIds) {
  if (userIds.length !== 2) {
    throw new Error("Pair format requires exactly 2 players");
  }
  
  const existingPair = await TournamentPair.findOne({
    tournamentId,
    $or: [
      { player1: userIds[0], player2: userIds[1] },
      { player1: userIds[1], player2: userIds[0] }
    ]
  });
  
  if (existingPair) {
    return { pair: existingPair, count: 0 };
  }
  
  const pair = await TournamentPair.create({
    tournamentId,
    teamName: `${players[0].fullName} & ${players[1].fullName}`,
    player1: userIds[0],
    player2: userIds[1],
  });
  const tournament = await Tournament.findById(tournamentId);

  if (!tournament) {
    throw new Error("Tournament not found");
  }

  const totalAfterAdd =
    Number(tournament.totalParticipants) + 2;

  if (totalAfterAdd > Number(tournament.drawSize)) {
    throw new Error("Participant size exceeds tournament draw size");
  }

  await TournamentPlayer.create({
    tournamentId,
    playerId: null,
    pairId: pair._id,
  });

  return { pair, count: 2 };
}

async createOrUpdateRounds(tournamentId, rounds, createdBy) {
  const resultRounds = [];

  for (let i = 0; i < rounds.length; i++) {
    const data = rounds[i];

    if (!data.date) {
      throw new Error(`Round ${i + 1}: Date is required`);
    }

    const roundNumber = data.roundNumber || i + 1;

    const duplicateDateRound = await Round.findOne({
      tournamentId,
      date: data.date,
      roundNumber: { $ne: roundNumber }
    });

    if (duplicateDateRound) {
      throw new Error(
        `Duplicate round date detected: ${data.date} is already assigned to round ${duplicateDateRound.roundNumber}`
      );
    }

    let round = await Round.findOne({
      tournamentId,
      roundNumber
    });

    if (round) {

      round.roundName = data.roundName || round.roundName;
      round.date = data.date;
      round.status = data.status || round.status;

      await round.save();
    } else {
  
      round = await Round.create({
        tournamentId,
        roundName: data.roundName || `Round ${roundNumber}`,
        roundNumber,
        date: data.date,
        status: data.status || "scheduled",
        createdBy,
      });
    }

    resultRounds.push(round);
  }

  return resultRounds;
}

async updateTournamentService(tournamentId, updateData, userId, role) {
  const { status,startDate, endDate, rules, rounds, players, location, rememberEmail, numberOfSeeds, tournamentName, sportName, drawFormat, description, entryConditions, range, drawSize} = updateData;
  
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) {
    throw new Error("Tournament not found");
  }
  
  const isOwner = tournament.createdBy.toString() === userId.toString();
  const isAdmin = role === "Admin";
  console.log(userId, role, tournament.createdBy);

  if (!isAdmin && !isOwner) {
    throw new Error("Not authorized to update this tournament");
  }

  if(drawSize !== undefined){
    tournament.drawSize = drawSize;
    await tournament.save();
  }
  
  const format = tournament.format;
  const tournamentUpdateData = {};
  let registrationResult = null;
  let createdRounds = null;
  
  const updateDrawSize = Number(tournament.drawSize);
  if (updateDrawSize && updateDrawSize > 0 && (updateDrawSize & (updateDrawSize - 1)) === 0) {

    tournamentUpdateData.totalRounds = Math.log2(updateDrawSize);
  }
  
  tournamentUpdateData.status= "scheduled";
  
  if (rules !== undefined) {
    tournamentUpdateData.rules = rules;
  }

  if (location !== undefined) {
    tournamentUpdateData.location = location;
  }
  
  if (rememberEmail !== undefined) {
    tournamentUpdateData.rememberEmail = rememberEmail;
  }
  if(numberOfSeeds !== undefined){
    tournamentUpdateData.numberOfSeeds = numberOfSeeds;
  }
  if(tournamentName !== undefined){
    tournamentUpdateData.tournamentName = tournamentName;
  }
  if(sportName !== undefined){
    tournamentUpdateData.sportName = sportName;
  }
  if(drawFormat !== undefined){
    tournamentUpdateData.drawFormat = drawFormat;
  }
  if(description !== undefined){
    tournamentUpdateData.description = description;
  }
  if(entryConditions !== undefined){
    tournamentUpdateData.entryConditions = entryConditions;
  }
  if(range !== undefined){
    tournamentUpdateData.range = range;
  }
    if(startDate !== undefined){
    tournamentUpdateData.startDate = startDate;
  }
     if(endDate !== undefined){
    tournamentUpdateData.endDate = endDate;
  }




  if (players && players.length > 0) {
    const allUserIds = [];
    const allRegistrations = [];
    const allPairs = [];
    
    if (format === "Single" || format === "Team") {

      const userIds = await this.findOrCreateUsers(players);
      const { registrations, count } = await this.registerSinglePlayers(tournamentId, userIds);
      
      allUserIds.push(...userIds);
      allRegistrations.push(...registrations);
      
      tournamentUpdateData.$addToSet = { players: { $each: userIds } };
      
      if (count > 0) {
        tournamentUpdateData.$inc = { totalParticipants: count };
      }
      
      registrationResult = {
        type: format,
        users: allUserIds,
        registrations: allRegistrations,
      };
    } else if (format === "Pairs") {
    
      if (players.length % 2 !== 0) {
        throw new Error("Pair format requires an even number of players");
      }
      
      let totalNewPairs = 0;
      
      for (let i = 0; i < players.length; i += 2) {
        const pairPlayers = [players[i], players[i + 1]];
        const userIds = await this.findOrCreateUsers(pairPlayers);
        const { pair, count } = await this.registerPairPlayers(tournamentId, pairPlayers, userIds);
        
        totalNewPairs += count;
        allUserIds.push(...userIds);
        
        if (count > 0) {
          allPairs.push(pair);
        }
      }
      
      if (allPairs.length > 0) {
        tournamentUpdateData.$addToSet = { 
          pairs: { $each: allPairs.map(p => p._id) } 
        };
      }
      
      if (totalNewPairs > 0) {
        tournamentUpdateData.$inc = { totalParticipants: totalNewPairs };
      }
      
      registrationResult = {
        type: format,
        users: allUserIds,
        pairs: allPairs,
      };
    }
  }
  
  // Handle rounds creation
  if (rounds && rounds.length > 0) {
    const createdBy = registrationResult?.users?.[0] || tournament.createdBy;
    createdRounds = await this.createOrUpdateRounds(tournamentId, rounds, createdBy);
  }
  
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
}

  // async deleteTournament(id, userId, role) {
  //   try {
  //     // Validate ID format
  //     if (!mongoose.Types.ObjectId.isValid(id)) {
  //       throw new Error("Invalid tournament ID");
  //     }

  //     const tournament = await Tournament.findById(id);

  //     if (!tournament) {
  //       throw new Error("Tournament not found");
  //     }

  //     // Authorization: Creator OR Admin can delete
  //     const isOwner = tournament.createdBy.toString() === userId.toString();
  //     const isAdmin = role === "Admin";

  //     if (!isOwner && !isAdmin) {
  //       throw new Error("Not authorized to delete this tournament");
  //     }


  //     await tournament.deleteOne();

  //     return { message: "Tournament deleted successfully" };
  //   } catch (error) {
  //     throw new Error(`Failed to delete tournament: ${error.message}`);
  //   }
  // }

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
      const isAdmin = role === "Admin";
      if (!isOwner && !isAdmin) {
        throw new Error("Not authorized to delete this tournament");
      }

      // Delete all tournament players associated with this tournament
      await TournamentPlayer.deleteMany({ tournamentId: id });
      
      await tournament.deleteOne();
      return { message: "Tournament deleted successfully" };
    } catch (error) {
      throw new Error(`Failed to delete tournament: ${error.message}`);
    }
  }


async getTournamentsByCreator(creatorId, filters = {}, page = 1, limit = 10) {
  try {

    const query = {
      createdBy: creatorId
    };

    if (filters.sportName) {
      query.sportName = { $regex: filters.sportName, $options: 'i' };
    }

    if (filters.drawFormat) {
      query.drawFormat = filters.drawFormat;
    }

    if (filters.format) {
      query.format = filters.format;
    }

    if (filters.tournamentName) {
      query.tournamentName = { $regex: filters.tournamentName, $options: 'i' };
    }

    if (filters.location) {
      query.location = filters.location;
    }

    if (filters.paymentStatus) {
      query.paymentStatus = filters.paymentStatus;
    }

    if (filters.status) {
      query.status = { $regex: filters.status, $options: "i" };
    }

    page = Math.max(1, page);
    limit = Math.max(1, limit);
    const skip = (page - 1) * limit;

    const [total, tournaments] = await Promise.all([
      Tournament.countDocuments(query),
      Tournament.find(query)
        .populate('createdBy', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    return {
      tournaments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    throw new Error(`Failed to fetch creator tournaments: ${error.message}`);
  }
}


async getTournamentMatchesService(
  tournamentId,
  roundNumber = null,
  page = 1,
  limit = 10
) {
  if (!tournamentId) {
    throw new Error("Tournament ID is required");
  }

  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) {
    throw new Error("Tournament not found");
  }

  const query = { tournamentId };

  if (roundNumber !== null) {
    query.round = Number(roundNumber);
  }

  const skip = (page - 1) * limit;

  const total = await Match.countDocuments(query);

  const rounds = await Round.find({ tournamentId })
    .sort({ roundNumber: 1 });

  const matches = await Match.find(query)
    .populate("player1Id player2Id", "fullName email profileImage score handicap clubName")
    .populate({
      path: "pair1Id",
      populate: {
        path: "player1 player2",
        select: "fullName email profileImage score handicap clubName"
      }
    })
    .populate({
      path: "pair2Id",
      populate: {
        path: "player1 player2",
        select: "fullName email profileImage score handicap clubName"
      }
    })
    .sort({ matchNumber: 1 })
    .skip(skip)
    .limit(limit);

  return {
    success: true,
    tournament,
    roundNumber,
    matches,
    rounds,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

}
function generateToken() {
   return crypto.randomBytes(32).toString("hex");
  }

export default new TournamentService();