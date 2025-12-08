// src/services/tournamentPlayer.service.js
import TournamentPlayer from '../others/tournamentPlayer.model.js';
import Tournament from '../tournament/tournament.model.js';
import User from "../user/user.model.js";

class TournamentPlayerService {

  async getAllPlayers(userId, userRole, filters = {}) {
    try {
      let query = {};

      if (userRole === "Organizer") {
        const tournaments = await Tournament.find({ createdBy: userId }).select("_id");
        const tournamentIds = tournaments.map(t => t._id);
        query.tournamentId = { $in: tournamentIds };
      }

      if (filters.tournamentId) {
        query.tournamentId = filters.tournamentId;
      }
      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
      }
      if (filters.assignMatch !== undefined) {
        query.assignMatch = filters.assignMatch;
      }

      const page = Number(filters.page) || 1;
      const limit = Number(filters.limit) || 10;
      const skip = (page - 1) * limit;

      const total = await TournamentPlayer.countDocuments(query);
      const totalPages = Math.ceil(total / limit);

      const players = await TournamentPlayer.find(query)
        .populate("tournamentId", "tournamentName startDate endDate")
        .populate("playerId", "firstName lastName email")
        .populate("pairId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return {
        success: true,
        data: players,
         pagination: {
          page,
          limit,
          total,
          totalPages
        },
      };

    } catch (error) {
      throw new Error(`Error fetching players: ${error.message}`);
    }
  }

  async getPlayersByTournament(tournamentId, userId, userRole) {
    try {
      // Verify organizer owns this tournament
      if (userRole === 'Organizer') {
        const tournament = await Tournament.findOne({ 
          _id: tournamentId, 
          createdBy: userId 
        });
        if (!tournament) {
          throw new Error('Tournament not found or unauthorized');
        }
      }

      const players = await TournamentPlayer.find({ tournamentId })
        .populate('playerId', 'firstName lastName email phone')
        .populate('pairId')
        .sort({ registeredAt: -1 });

      return players;
    } catch (error) {
      throw new Error(`Error fetching tournament players: ${error.message}`);
    }
  }

  async getPlayerById(playerId, userId, userRole) {
    try {
      const player = await TournamentPlayer.findById(playerId)
        .populate('tournamentId')
        .populate('playerId', 'firstName lastName email phone')
        .populate('pairId');

      if (!player) {
        throw new Error('Player not found');
      }

      if (userRole === 'organizer') {
        const tournament = await Tournament.findOne({ 
          _id: player.tournamentId, 
          createdBy: userId 
        });
        if (!tournament) {
          throw new Error('Unauthorized access');
        }
      }

      return player;
    } catch (error) {
      throw new Error(`Error fetching player: ${error.message}`);
    }
  }

  // async updatePlayer(playerId, updateData, userId, userRole){
  //   try{
  //     const player = await TournamentPlayer.findById(playerId)
  //                   .populate('tournamentId')
  //                   .populate('playerId', 'firstName lastName email phone')
  //                   .populate('pairId');

  //     if(!player){
  //       throw new Error ('Player not found', 404);
  //     }
  //     if(userRole === "Organizer"){
  //       const tournament = await Tournament.findOne({
  //         _id: player.tournamentId,
  //         createdBy: userId
  //       })
  //       console.log(tournament);

  //       if(!tournament){
  //         throw new Error("Unauthorized access");
  //       }
  //     }
      

  //     return player;
  //   }catch(err){
  //     throw new Error("player not found", 404);
  //   }

  // }

  async deletePlayer(playerId, userId, userRole) {
    try {
      const player = await TournamentPlayer.findById(playerId)
        .populate('tournamentId')
        .populate('playerId', 'firstName lastName email phone')
        .populate('pairId');

      if (!player) {
        throw new Error('Player not found');
      }

      if (userRole === 'Organizer') {
        const tournament = await Tournament.findOne({ 
          _id: player.tournamentId, 
          createdBy: userId 
        });
        if (!tournament) {
          throw new Error('Unauthorized access');
        }
      }

      if(player.playerId){
        await User.findByIdAndDelete(player.playerId._id);
      }
      if(player.pairId){
        if(player.pairId.player1Id){
          await User.findByIdAndDelete(player.pairId.player1Id);
        }
        if(player.pairId.player2Id){
          await User.findByIdAndDelete(player.pair.player2Id);
        }
      }

      await TournamentPlayer.findByIdAndDelete(player._id);

      return {
        success:true,
        message:"Player deleted successfully"
      };
    } catch (error) {
      throw new Error(`Error fetching player: ${error.message}`);
    }
  }


  async togglePlayerStatus(playerId, userId, userRole) {
    try {
      const player = await TournamentPlayer.findById(playerId);
      if (!player) {
        throw new Error('Player not found');
      }

      if (userRole === 'organizer') {
        const tournament = await Tournament.findOne({ 
          _id: player.tournamentId, 
          createdBy: userId 
        });
        if (!tournament) {
          throw new Error('Unauthorized access');
        }
      }

      player.isActive = !player.isActive;
      await player.save();

      return player;
    } catch (error) {
      throw new Error(`Error toggling player status: ${error.message}`);
    }
  }

  async getPlayerStats(tournamentId, userId, userRole) {
    try {
     
      if (userRole === 'organizer') {
        const tournament = await Tournament.findOne({ 
          _id: tournamentId, 
          createdBy: userId 
        });
        if (!tournament) {
          throw new Error('Unauthorized access');
        }
      }

      const stats = await TournamentPlayer.aggregate([
        { $match: { tournamentId: mongoose.Types.ObjectId(tournamentId) } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: ['$isActive', 1, 0] } },
            registered: { $sum: { $cond: ['$registeredAt', 1, 0] } },
            assignedToMatch: { $sum: { $cond: ['$assignMatch', 1, 0] } },
          }
        }
      ]);

      return stats[0] || { total: 0, active: 0, registered: 0, assignedToMatch: 0 };
    } catch (error) {
      throw new Error(`Error fetching player stats: ${error.message}`);
    }
  }
}

export default new TournamentPlayerService();