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

      // 🎯 Query tournament players
      let tournamentPlayers = await TournamentPlayer.find(filters)
        .populate({
          path: "tournamentId",
          select: "tournamentName sportName format"
        })
        .populate({
          path: "playerId",
          select: "fullName email profileImage status handicap clubName country phone"
        })
        .populate({
          path: "pairId",
          populate: [
            {
              path: "player1",
              select: "fullName email profileImage status handicap clubName country phone"
            },
            {
              path: "player2",
              select: "fullName email profileImage status handicap clubName country phone"
            }
          ]
        })
        .sort({ createdAt: -1 });

      let allPlayers = [];
      
      tournamentPlayers.forEach(tp => {
        if (tp.pairId) {
          if (tp.pairId.player1) {
            allPlayers.push({
              playerDetails: tp.pairId.player1,
              tournamentDetails: tp.tournamentId,
              playerId:tp._id,
            });
          }
          if (tp.pairId.player2) {
            allPlayers.push({
              playerDetails: tp.pairId.player2,
              tournamentDetails: tp.tournamentId,
              playerId:tp._id,
            });
          }
        } 
        if (tp.playerId) {
          allPlayers.push({
            playerDetails: tp.playerId,
            tournamentDetails: tp.tournamentId,
            playerId:tp._id,
          });
        }
      });

      // 🔎 Apply search filter on flattened players
      if (search) {
        const searchLower = search.toLowerCase();
        allPlayers = allPlayers.filter(p => 
          p.playerDetails.fullName?.toLowerCase().includes(searchLower) ||
          p.playerDetails.email?.toLowerCase().includes(searchLower)
        );
      }

      // 📊 Pagination on flattened array
      const totalRecords = allPlayers.length;
      const paginatedPlayers = allPlayers.slice(skip, skip + limit);
      const totalPages = Math.ceil(totalRecords / limit);

      return {
        success: true,
        count: paginatedPlayers.length,
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
        data: paginatedPlayers
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
        // .populate('tournamentId')
        .populate('playerId', 'fullName email phone seeder')
        .populate({
          path: 'pairId',
          populate: [
            { path: 'player1', select: 'fullName email phone seeder' },
            { path: 'player2', select: 'fullName email phone seeder' },
          ],
        });

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

  async deletePlayer(playerId, userId, userRole) {
    try {
      const player = await TournamentPlayer.findById(playerId)
        .populate('tournamentId')
        .populate('playerId', 'firstName lastName email phone')
        .populate('pairId');

      if (!player) {
        throw new Error('Player not found');
      }

       const tournament = await Tournament.findOne({ 
          _id: player.tournamentId, 
          createdBy: userId 
        });

      if (userRole === 'Organizer' || userRole === 'Admin') {
        if (!tournament) {
          throw new Error('Unauthorized access');
        }
      }

      if(player.playerId){
        tournament.totalParticipants = Math.max(0, tournament.totalParticipants - 1);
        await tournament.save();
      }
      if(player.pairId){
        tournament.totalParticipants = Math.max(0, tournament.totalParticipants - 2);
        await tournament.save();
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
async updatePlayer(playerId, updateData, userId, userRole) {
  try {
    const player = await TournamentPlayer.findById(playerId)
      .populate('tournamentId')
      .populate('playerId')
      .populate({
        path: 'pairId',
        populate: [
          { path: 'player1' },
          { path: 'player2' },
        ],
      });

    if (!player) {
      throw new Error('Player not found');
    }

    // ✅ Update main user (optional)
    if (updateData.userInfo && player.playerId) {
      await User.findByIdAndUpdate(
        player.playerId._id,
        updateData.userInfo,
        { new: true }
      );
    }
    // console.log("Main user updated with:", updateData.pairInfo);
    // ✅ Update pair users (optional)
    if (updateData.pairInfo && player.pairId) {
      const { player1Info, player2Info } = updateData.pairInfo;

      if (player1Info && player.pairId.player1) {
        await User.findByIdAndUpdate(
          player.pairId.player1._id,
          player1Info,
          { new: true }
        );
      }

      if (player2Info && player.pairId.player2) {
        await User.findByIdAndUpdate(
          player.pairId.player2._id,
          player2Info,
          { new: true }
        );
      }
    }

    // ✅ Return updated player
    const updatedPlayer = await TournamentPlayer.findById(playerId)
      // .populate('tournamentId')
      .populate('playerId', 'fullName email phone seeder')
      .populate({
        path: 'pairId',
        populate: [
          { path: 'player1', select: 'fullName email phone seeder' },
          { path: 'player2', select: 'fullName email phone seeder' },
        ],
      });

    return updatedPlayer;
  } catch (error) {
    throw new Error(`Error updating player: ${error.message}`);
  }
}

  async togglePlayerStatus(playerId, userId, userRole) {
    try {
      const player = await TournamentPlayer.findById(playerId);
      if (!player) {
        throw new Error('Player not found');
      }

      if (userRole === 'organizer' || userRole === 'admin') {
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