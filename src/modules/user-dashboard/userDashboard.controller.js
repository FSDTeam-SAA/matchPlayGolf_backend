import userDashboardService from "./userDashboard.service.js";
import TournamentPlayer from "../others/tournamentPlayer.model.js";
import Tournament from "../tournament/tournament.model.js";
import Match from "../match/match.model.js";
import TournamentPair from "../others/tournamentPair.model.js";

export const getDashboardSummary = async (req, res) => {
  try {
    const summary = await userDashboardService.getUserSummary(req.user._id);

    return res.status(200).json({
      success: true,
      data: summary,
      message: "User dashboard summary fetched successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch dashboard summary"
    });
  }
};

export const getUserCurrentTournaments = async (req, res) => {
  try {
    const tournaments = await userDashboardService.getUserTournaments(
      req.user._id
    );

    return res.status(200).json({
      success: true,
      data: tournaments,
      message: "User tournaments fetched successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch user tournaments"
    });
  }
};

export const getUserTournaments = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, page = 1, limit = 10 } = req.query;
    
    const skip = (page - 1) * limit;

    // Find all tournament registrations for this user
    const tournamentPlayers = await TournamentPlayer.find({
      playerId: userId,
      isActive: true
    }).select('tournamentId');
    
    const tournamentIds = tournamentPlayers.map(tp => tp.tournamentId);
    
    if (tournamentIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          tournaments: [],
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: 0,
            totalPages: 0,
          }
        },
        message: "No tournaments found for this user"
      });
    }
    
    // Build query with tournament IDs
    const query = {
      _id: { $in: tournamentIds }
    };
    
    // Add status filter if provided
    if (status) {
      query.status = status.toLowerCase(); // "upcoming", "in progress", "completed", "cancelled", "scheduled"
    }
    
    const total = await Tournament.countDocuments(query);
    
    const tournaments = await Tournament.find(query)
      .populate('createdBy', 'fullName email')
      .populate('knockoutStage')
      .sort({ startDate: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: { 
        tournaments,
        pagination: {
          page: Number(page), 
          limit: Number(limit),
          total: total,
          totalPages: Math.ceil(total / limit),
        }
      },
      message: "User tournaments fetched successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to fetch user tournaments: ${error.message}`
    });
  }
};

export const getPlayerMatches = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log("Fetching matches for user:", userId);
    // Get filters from query params
    const { tournamentId, status, matchType, page = 1, limit = 10 } = req.query;
    
    const query = {
      $or: [
        { player1Id: userId },
        { player2Id: userId }
      ]
    };
    
    // If the player is also in pairs, find their pairs
    const userPairs = await TournamentPair.find({
      $or: [
        { player1: userId },
        { player2: userId }
      ]
    }).select('_id');
    
    const pairIds = userPairs.map(p => p._id);
    
    if (pairIds.length > 0) {
      // Extend the query to include pair matches
      query.$or.push(
        { pair1Id: { $in: pairIds } },
        { pair2Id: { $in: pairIds } }
      );
    }
    
    // Apply additional filters from query params
    if (tournamentId) {
      query.tournamentId = tournamentId;
    }
    
    // For enum fields, use exact match (case-insensitive if needed)
    if (status) {
      query.status = status.toLowerCase(); // Ensure lowercase to match enum
    }
    
    if (matchType) {
      query.matchType = matchType; // "Single", "Pair", or "Team"
    }
    
    const skip = (page - 1) * limit;
    const total = await Match.countDocuments(query);
    
    const matches = await Match.find(query)
      .populate('tournamentId', 'tournamentName sportName format startDate endDate')
      .populate('roundId', 'roundName roundNumber date')
      .populate('knockoutStageId', 'stageName')
      .populate('player1Id', 'fullName email profileImage')
      .populate('player2Id', 'fullName email profileImage')
      .populate({
        path: 'pair1Id',
        populate: {
          path: 'player1 player2',
          select: 'fullName email profileImage'
        }
      })
      .populate({
        path: 'pair2Id',
        populate: {
          path: 'player1 player2',
          select: 'fullName email profileImage'
        }
      })
      .populate('winner')
      .populate('createdBy', 'fullName email')
      .sort({ date: -1, time: 1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        matches,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: total,
          totalPages: Math.ceil(total / limit),
        }
      },
      message: "Player matches fetched successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to fetch player matches: ${error.message}`
    });
  }
}

/**
 * Get combined view: tournaments + matches for a player
 */
export const getPlayerTournamentDashboard = async (userId, page = 1, limit = 10) => {
  try {
    // Get tournaments
    const tournaments = await getUserTournaments(userId, page, limit);
    
    // Get all matches for this player
    const matches = await getPlayerMatches(userId, {}, 1, 100); // Get more matches
    
    // Group matches by tournament
    const matchesByTournament = {};
    matches.matches.forEach(match => {
      const tournamentId = match.tournamentId._id.toString();
      if (!matchesByTournament[tournamentId]) {
        matchesByTournament[tournamentId] = [];
      }
      matchesByTournament[tournamentId].push(match);
    });
    
    // Enhance tournaments with their matches
    const tournamentsWithMatches = tournaments.tournaments.map(tournament => ({
      ...tournament.toObject(),
      matches: matchesByTournament[tournament._id.toString()] || []
    }));
    
    return {
      tournaments: tournamentsWithMatches,
      pagination: tournaments.pagination
    };
  } catch (error) {
    throw new Error(`Failed to fetch player dashboard: ${error.message}`);
  }
}
export const getPlayerMatchesByTournament = async (req, res) => {
  try {
    const userId = req.user._id;
    const { tournamentId } = req.params;
    const { status, matchType, page = 1, limit = 20 } = req.query;
    
    // Verify user is registered in this tournament
    const registration = await TournamentPlayer.findOne({
      playerId: userId,
      tournamentId: tournamentId,
      isActive: true
    });
    
    if (!registration) {
      return res.status(403).json({
        success: false,
        message: "You are not registered in this tournament"
      });
    }
    
    // Build query
    const query = {
      tournamentId: tournamentId,
      $or: [
        { player1Id: userId },
        { player2Id: userId }
      ]
    };
    
    // Check for pair matches
    const userPairs = await TournamentPair.find({
      $or: [
        { player1: userId },
        { player2: userId }
      ]
    }).select('_id');
    
    const pairIds = userPairs.map(p => p._id);
    
    if (pairIds.length > 0) {
      query.$or.push(
        { pair1Id: { $in: pairIds } },
        { pair2Id: { $in: pairIds } }
      );
    }
    
    // Apply filters
    if (status) {
      query.status = status;
    }
    
    if (matchType) {
      query.matchType = matchType;
    }
    
    const skip = (page - 1) * limit;
    const total = await Match.countDocuments(query);
    
    const matches = await Match.find(query)
      .populate('tournamentId', 'tournamentName sportName format startDate endDate')
      .populate('roundId', 'roundName roundNumber date')
      .populate('knockoutStageId', 'stageName')
      .populate('player1Id', 'fullName email profileImage')
      .populate('player2Id', 'fullName email profileImage')
      .populate({
        path: 'pair1Id',
        populate: {
          path: 'player1 player2',
          select: 'fullName email profileImage'
        }
      })
      .populate({
        path: 'pair2Id',
        populate: {
          path: 'player1 player2',
          select: 'fullName email profileImage'
        }
      })
      .populate('winner')
      .populate('createdBy', 'fullName email')
      .sort({ round: 1, matchNumber: 1 })
      .skip(skip)
      .limit(limit);
    
    res.status(200).json({
      success: true,
      data: {
        matches,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: total,
          totalPages: Math.ceil(total / limit),
        }
      },
      message: "Tournament matches fetched successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to fetch tournament matches: ${error.message}`
    });
  }
};