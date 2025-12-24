// src/services/tournamentPlayer.service.js
import TournamentPlayer from '../others/tournamentPlayer.model.js';
import Tournament from '../tournament/tournament.model.js';
import User from "../user/user.model.js";

class TournamentPlayerService {

  async getAllPlayers(userId, userRole, queryParams) {
    try {
      // 📌 Pagination params
      const page = Math.max(parseInt(queryParams.page) || 1, 1);
      const limit = Math.min(parseInt(queryParams.limit) || 10, 100);
      const skip = (page - 1) * limit;

      // 🔍 Search/Filter params
      const { tournamentName, search } = queryParams;

      const filters = { isActive: true };

      // 🔐 Role-based tournament filtering
      let tournamentQuery = {};

      if (userRole !== "Admin") {
        tournamentQuery.createdBy = userId;
      }

      // 🎯 Filter by tournament name (partial match, case-insensitive)
      if (tournamentName) {
        tournamentQuery.tournamentName = {
          $regex: tournamentName,
          $options: "i"
        };
      }

      const tournaments = await Tournament.find(tournamentQuery, { _id: 1 });

      if (!tournaments.length) {
        return {
          success: true,
          count: 0,
          pagination: {
            page,
            limit,
            totalPages: 0,
            totalRecords: 0
          },
          filters: {
            tournamentName: tournamentName || null,
            search: search || null
          },
          data: []
        };
      }

      filters.tournamentId = {
        $in: tournaments.map(t => t._id)
      };

      // 🔎 Optional: Search by player name or email
      let playerQuery = {};
      if (search) {
        playerQuery = {
          $or: [
            { fullName: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } }
          ]
        };
      }

      // 📊 Total count (before pagination)
      const totalRecords = await TournamentPlayer.countDocuments(filters);

      // 🎯 Query with population and optional player search
      let query = TournamentPlayer.find(filters)
        .populate({
          path: "tournamentId",
          select: "tournamentName sportName format"
        })
        .populate({
          path: "playerId",
          select: "fullName email profileImage",
          match: search ? playerQuery : {}
        })
        .populate({
          path: "pairId",
          populate: [
            {
              path: "player1",
              select: "fullName email profileImage"
            },
            {
              path: "player2",
              select: "fullName email profileImage"
            }
          ]
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      let players = await query;

      // 🧹 Filter out null playerId results (when search doesn't match)
      if (search) {
        players = players.filter(p => p.playerId !== null);
      }

      const totalPages = Math.ceil(totalRecords / limit);

      return {
        success: true,
        count: players.length,
        pagination: {
          page,
          limit,
          totalPages,
          totalRecords
        },
        filters: {
          tournamentName: tournamentName || null,
          search: search || null
        },
        data: players
      };
    } catch (error) {
      throw new Error(`Failed to get players: ${error.message}`);
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