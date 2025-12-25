import matchService from "./match.service.js";
import { emitMatchNotification } from "../notification/notification.controller.js";
import Match from "./match.model.js";
import TournamentPair from "../others/tournamentPair.model.js";
import TournamentPlayer from "../others/tournamentPlayer.model.js";
import Tournament from "../tournament/tournament.model.js";
import mongoose from "mongoose";

/**
 * @desc    Create a new match
 * @route   POST /api/matches
 * @access  Private
 */
export const createTournamentMatch = async (req, res) => {
  try {
    const {
      tournamentId,
      roundId,
      matchType,
      player1Id,
      player2Id,
      pair1Id,
      pair2Id,
      time,
      startingHole,
      groupNumber,
      status,
      date,
      score
    } = req.body;

    // Validation
    if (!tournamentId || !roundId || !matchType) {
      return res.status(400).json({
        success: false,
        message: "Tournament ID, round ID, and match type are required"
      });
    }

    // Match type validation (case-sensitive to match schema)
    if (!["Single", "Pair", "Team"].includes(matchType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid match type. Must be 'Single', 'Pair', or 'Team'"
      });
    }

    // Single match validation
    if (matchType === "Single" && (!player1Id || !player2Id) || matchType === "Team" && (!player1Id || !player2Id)) {
      return res.status(400).json({
        success: false,
        message: "Single match requires both player1Id and player2Id"
      });
    }

    // Pair match validation
    if (matchType === "Pair" && (!pair1Id || !pair2Id)) {
      return res.status(400).json({
        success: false,
        message: "Pair match requires both pair1Id and pair2Id"
      });
    }

    // Status validation (match schema enum)
    if (
      status &&
      !["Upcoming", "In Progress", "Completed", "Cancelled"].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid status. Must be 'Upcoming', 'In Progress', 'Completed', or 'Cancelled'"
      });
    }

    const matchData = {
      tournamentId,
      roundId,
      matchType,
      date,
      score,
      status: status || "Upcoming",
      createdBy: req.user._id,
      ...(time && { time }),
      ...(startingHole && { startingHole }),
      ...(groupNumber && { groupNumber })
    };

    // Add type-specific fields
    if (matchType === "Single" || matchType === "Team") {
      matchData.player1Id = player1Id;
      matchData.player2Id = player2Id;
    } else if (matchType === "Pair") {
      matchData.pair1Id = pair1Id;
      matchData.pair2Id = pair2Id;
    }

    const match = await matchService.createTournamentMatch(matchData);

    // 🔥 EMIT SOCKET NOTIFICATION - ONLY TO MATCH PARTICIPANTS
    const io = req.app.get("io");
    if (io) {
      emitMatchNotification(io, "MATCH_CREATED", match);
    }

    res.status(201).json({
      success: true,
      data: match,
      message: "Match created successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Update match
 * @route   PUT /api/matches/:id
 * @access  Private
 */
export const updateTournamentMatch = async (req, res) => {
  try {
    const updateData = req.body;

    // Validate status if provided
    if (
      updateData.status &&
      !["Upcoming", "In Progress", "Completed", "Cancelled"].includes(
        updateData.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid status. Must be 'Upcoming', 'In Progress', 'Completed', or 'Cancelled'"
      });
    }

    // Validate matchType if provided
    if (
      updateData.matchType &&
      !["Single", "Pair"].includes(updateData.matchType)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid match type. Must be 'Single' or 'Pair'"
      });
    }

    const match = await matchService.updateTournamentMatch(
      req.params.id,
      updateData,
      req.user._id,
      req.user.role,
      req.files || null      
    );

    // 🔥 EMIT SOCKET NOTIFICATION - ONLY TO MATCH PARTICIPANTS
    const io = req.app.get("io");
    if (io) {
      emitMatchNotification(io, "MATCH_UPDATED", match);
    }

    res.status(200).json({
      success: true,
      data: match,
      message: "Match updated successfully"
    });
  } catch (error) {
    const statusCode = error.message.includes("not found")
      ? 404
      : error.message.includes("Not authorized")
      ? 403
      : 500;

    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Update match scores
 * @route   PATCH /api/matches/:matchId/scores
 * @access  Private
 */
export const updateTournamentMatchScores = async (req, res) => {
  try {
    const scoresData = req.body;
    const match = await matchService.updateTournamentMatchScores(
      req.params.matchId,
      scoresData,
      req.user._id
    );

    // 🔥 EMIT SOCKET NOTIFICATION - ONLY TO MATCH PARTICIPANTS
    const io = req.app.get("io");
    if (io) {
      emitMatchNotification(io, "MATCH_UPDATED", match);
    }

    res.status(200).json({
      success: true,
      data: match,
      message: "Match scores updated successfully"
    });
  } catch (error) {
    const statusCode = error.message === "Match not found" ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Delete match
 * @route   DELETE /api/matches/:matchId
 * @access  Private
 */
export const deleteTournamentMatch = async (req, res) => {
  try {
    // 🔥 GET MATCH BEFORE DELETING (to get participant IDs)
    const match = await matchService.getTournamentMatchById(req.params.matchId);

    const result = await matchService.deleteTournamentMatch(
      req.params.matchId,
      req.user._id,
      req.user.role
    );

    // 🔥 EMIT SOCKET NOTIFICATION - ONLY TO MATCH PARTICIPANTS
    const io = req.app.get("io");
    if (io) {
      emitMatchNotification(io, "MATCH_DELETED", match);
    }

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    const statusCode = error.message.includes("not found")
      ? 404
      : error.message.includes("Not authorized")
      ? 403
      : 500;

    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Get all matches with pagination and filtering
 * @route   GET /api/matches
 * @access  Public
 */
export const getAllTournamentMatches = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      tournamentName,
      roundName,
      matchType,
      status,
      tournamentId
    } = req.query;

    const filters = {
      tournamentName,
      roundName,
      matchType,
      status,
      tournamentId
    };

    const result = await matchService.getAllTournamentMatches(
      filters,
      parseInt(page),
      parseInt(limit)
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Get match by ID
 * @route   GET /api/matches/:id
 * @access  Public
 */
export const getTournamentMatchById = async (req, res) => {
  try {
    const match = await matchService.getTournamentMatchById(req.params.id);

    res.status(200).json({
      success: true,
      data: match
    });
  } catch (error) {
    const statusCode = error.message === "Match not found" ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Get matches by round
 * @route   GET /api/matches/round/:roundId
 * @access  Public
 */
export const getTournamentMatchesByRound = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const result = await matchService.getTournamentMatchesByRound(
      req.params.roundId,
      parseInt(page),
      parseInt(limit)
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getUserMatchStats = async (req, res) => {
  try {
    const  userId  = req.user._id;
    const { tournamentId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Find user's pairs
    const userPairs = await TournamentPair.find({
      $or: [
        { player1: userObjectId },
        { player2: userObjectId }
      ],
      isActive: true
    }).select('_id');

    const pairIds = userPairs.map(pair => pair._id);

    // Build base match query
    const baseMatchQuery = {
      $or: [
        { matchType: 'Single', player1Id: userObjectId },
        { matchType: 'Single', player2Id: userObjectId },
        { matchType: 'Pair', pair1Id: { $in: pairIds } },
        { matchType: 'Pair', pair2Id: { $in: pairIds } }
      ]
    };

    // Add tournament filter if provided
    if (tournamentId && mongoose.Types.ObjectId.isValid(tournamentId)) {
      baseMatchQuery.tournamentId = new mongoose.Types.ObjectId(tournamentId);
    }

    // Aggregate for overall statistics
    const stats = await Match.aggregate([
      {
        $match: baseMatchQuery
      },
      {
        $group: {
          _id: null,
          totalMatches: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] }
          },
          upcoming: {
            $sum: { $cond: [{ $eq: ['$status', 'Upcoming'] }, 1, 0] }
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] }
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] }
          },
          singleWins: {
            $sum: {
              $cond: [
                { $eq: ['$winnerPlayerId', userObjectId] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Count pair wins separately (where user's team won)
    const pairWinsQuery = {
      ...baseMatchQuery,
      matchType: 'Pair',
      winnerTeamId: { $in: pairIds }
    };
    const pairWins = await Match.countDocuments(pairWinsQuery);

    // Calculate total wins and win percentage
    const totalWins = (stats[0]?.singleWins || 0) + pairWins;
    const completedMatches = stats[0]?.completed || 0;
    const winPercentage = completedMatches > 0 
      ? ((totalWins / completedMatches) * 100).toFixed(2) 
      : 0;

    // Get status-based filtered matches
    const statusBreakdown = {
      completed: completedMatches,
      upcoming: stats[0]?.upcoming || 0,
      inProgress: stats[0]?.inProgress || 0,
      cancelled: stats[0]?.cancelled || 0
    };

    // Get tournament-specific data if tournamentId provided
    let tournamentStats = null;
    if (tournamentId && mongoose.Types.ObjectId.isValid(tournamentId)) {
      const tournamentMatches = await Match.find(baseMatchQuery)
        .populate('roundId', 'name roundNumber')
        .select('status roundId matchType winnerPlayerId winnerTeamId')
        .lean();

      tournamentStats = {
        tournamentId,
        totalMatches: tournamentMatches.length,
        matchesByRound: {},
        wins: tournamentMatches.filter(m => 
          m.winnerPlayerId?.toString() === userId || 
          pairIds.some(pairId => pairId.toString() === m.winnerTeamId?.toString())
        ).length
      };

      // Group by round
      tournamentMatches.forEach(match => {
        if (match.roundId) {
          const roundName = match.roundId.name || `Round ${match.roundId.roundNumber}`;
          if (!tournamentStats.matchesByRound[roundName]) {
            tournamentStats.matchesByRound[roundName] = 0;
          }
          tournamentStats.matchesByRound[roundName]++;
        }
      });
    }

    const responseData = {
      totalMatches: stats[0]?.totalMatches || 0,
      totalWins,
      totalLosses: completedMatches - totalWins,
      winPercentage: parseFloat(winPercentage),
      statusBreakdown,
      matchTypeBreakdown: {
        singleWins: stats[0]?.singleWins || 0,
        pairWins
      }
    };

    if (tournamentStats) {
      responseData.tournamentSpecific = tournamentStats;
    }

    return res.status(200).json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Error fetching user match stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching user match statistics',
      error: error.message
    });
  }
};

export const getUserTournamentMatches = async (req, res) => {
  try {
    const { tournamentId } = req.body;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(tournamentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID or tournament ID'
      });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const tournamentObjectId = new mongoose.Types.ObjectId(tournamentId);

    // Find user's pairs for this tournament
    const userPairs = await TournamentPair.find({
      tournamentId: tournamentObjectId,
      $or: [
        { player1: userObjectId },
        { player2: userObjectId }
      ],
      isActive: true
    }).select('_id');

    const pairIds = userPairs.map(pair => pair._id);

    // Find all matches
    const matches = await Match.find({
      tournamentId: tournamentObjectId,
      $or: [
        { matchType: 'Single', player1Id: userObjectId },
        { matchType: 'Single', player2Id: userObjectId },
        { matchType: 'Pair', pair1Id: { $in: pairIds } },
        { matchType: 'Pair', pair2Id: { $in: pairIds } }
      ]
    })
    .populate('tournamentId', 'name startDate endDate')
    .populate('roundId', 'name roundNumber')
    .populate('player1Id', 'firstName lastName email profileImage')
    .populate('player2Id', 'firstName lastName email profileImage')
    .populate('pair1Id')
    .populate('pair2Id')
    .populate('players.userId', 'firstName lastName email profileImage')
    .populate({
      path: 'teams.players.userId',
      select: 'firstName lastName email profileImage'
    })
    .sort({ 'roundId.roundNumber': 1, teeTime: 1 })
    .lean();

    // Calculate tournament-specific stats
    const completed = matches.filter(m => m.status === 'Completed').length;
    const wins = matches.filter(m => 
      m.winnerPlayerId?.toString() === userId || 
      pairIds.some(pairId => pairId.toString() === m.winnerTeamId?.toString())
    ).length;

    const tournamentStats = {
      totalMatches: matches.length,
      completed,
      upcoming: matches.filter(m => m.status === 'Upcoming').length,
      inProgress: matches.filter(m => m.status === 'In Progress').length,
      wins,
      losses: completed - wins,
      winPercentage: completed > 0 ? ((wins / completed) * 100).toFixed(2) : 0
    };

    return res.status(200).json({
      success: true,
      tournamentId,
      stats: tournamentStats,
      matches
    });

  } catch (error) {
    console.error('Error fetching tournament matches:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching tournament matches',
      error: error.message
    });
  }
};

export const getUserMatchesWithFilters = async (req, res) => {
  try {
    const  userId  = req.user._id;
    const { 
      status,
      page = 1,
      limit = 10 
    } = req.query;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Find all pairs where user is player1 or player2
    const userPairs = await TournamentPair.find({
      $or: [
        { player1: userObjectId },
        { player2: userObjectId }
      ],
      isActive: true
    }).select('_id');

    const pairIds = userPairs.map(pair => pair._id);

    // Build base query to find all matches for the user
    const query = {
      $or: [
        // Single matches - user as player1 or player2
        { matchType: 'Single', player1Id: userObjectId },
        { matchType: 'Single', player2Id: userObjectId },
        { matchType: 'Single', 'players.userId': userObjectId },
        
        // Pair matches - user's pair as team1 or team2
        { matchType: 'Pair', pair1Id: { $in: pairIds } },
        { matchType: 'Pair', pair2Id: { $in: pairIds } }
      ]
    };

    // Apply status filter if provided
    if (status) {
      // Validate status value
      const validStatuses = ['Upcoming', 'In Progress', 'Completed', 'Cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }
      query.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch matches and total count in parallel
    const [matches, total] = await Promise.all([
      Match.find(query)
        .populate('tournamentId', 'name startDate endDate location')
        .populate('roundId', 'name roundNumber')
        .populate('player1Id', 'firstName lastName email profileImage handicap')
        .populate('player2Id', 'firstName lastName email profileImage handicap')
        .populate('pair1Id')
        .populate('pair2Id')
        .populate('players.userId', 'firstName lastName email profileImage handicap')
        .populate({
          path: 'teams.pairId',
          populate: {
            path: 'player1 player2',
            select: 'firstName lastName email profileImage handicap'
          }
        })
        .populate({
          path: 'teams.players.userId',
          select: 'firstName lastName email profileImage handicap'
        })
        .sort({ date: -1, teeTime: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Match.countDocuments(query)
    ]);

    // Format matches with user-specific context
    const formattedMatches = matches.map(match => {
      let userContext = {
        isPlayer: false,
        role: null,
        opponent: null,
        userStats: null,
        isWinner: false
      };

      if (match.matchType === 'Single') {
        // Single match context
        if (match.player1Id?._id.toString() === userId) {
          userContext.isPlayer = true;
          userContext.role = 'player1';
          userContext.opponent = match.player2Id;
          userContext.userStats = match.players?.find(p => 
            p.userId?._id?.toString() === userId
          );
          userContext.isWinner = match.winnerPlayerId?.toString() === userId;
        } else if (match.player2Id?._id.toString() === userId) {
          userContext.isPlayer = true;
          userContext.role = 'player2';
          userContext.opponent = match.player1Id;
          userContext.userStats = match.players?.find(p => 
            p.userId?._id?.toString() === userId
          );
          userContext.isWinner = match.winnerPlayerId?.toString() === userId;
        }
      } else if (match.matchType === 'Pair') {
        // Pair match context
        const userTeam = match.teams?.find(team => 
          team.players?.some(p => p.userId?._id?.toString() === userId)
        );
        
        if (userTeam) {
          userContext.isPlayer = true;
          userContext.role = 'team_member';
          userContext.userTeam = {
            teamName: userTeam.teamName,
            pairId: userTeam.pairId,
            totalScore: userTeam.totalScore
          };
          userContext.userStats = userTeam.players?.find(p => 
            p.userId?._id?.toString() === userId
          );
          userContext.isWinner = pairIds.some(pairId => 
            pairId.toString() === match.winnerTeamId?.toString()
          );
          
          // Get opponent team
          const opponentTeam = match.teams?.find(team => 
            !team.players?.some(p => p.userId?._id?.toString() === userId)
          );
          userContext.opponent = opponentTeam;
        }
      }

      return {
        ...match,
        userContext
      };
    });

    // Calculate summary statistics
    const stats = {
      total: total,
      returned: matches.length,
      completed: matches.filter(m => m.status === 'Completed').length,
      upcoming: matches.filter(m => m.status === 'Upcoming').length,
      inProgress: matches.filter(m => m.status === 'In Progress').length,
      cancelled: matches.filter(m => m.status === 'Cancelled').length,
      wins: formattedMatches.filter(m => m.userContext.isWinner).length
    };

    return res.status(200).json({
      success: true,
      message: 'Matches retrieved successfully',
      stats,
      pagination: {
        currentPage: parseInt(page),
        pageSize: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total
      },
      filters: {
        status: status || 'all'
      },
      data: formattedMatches
    });

  } catch (error) {
    console.error('Error fetching user matches with filters:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching user matches',
      error: error.message
    });
  }
};

export const getUserActiveTournaments = async (req, res) => {
  try {
    const  userId  = req.user._id;
    const { 
      page = 1,
      limit = 10 
    } = req.query;

    // Validate userIdF
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const currentDate = new Date();

    // Find all tournament players/registrations for this user
    const userTournamentPlayers = await TournamentPlayer.find({
      playerId: userObjectId,
      isActive: true
    }).select('tournamentId pairId');

    // Extract tournament IDs
    const tournamentIds = userTournamentPlayers.map(tp => tp.tournamentId);

    if (tournamentIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No active tournaments found',
        stats: {
          total: 0,
          returned: 0
        },
        pagination: {
          currentPage: parseInt(page),
          pageSize: parseInt(limit),
          totalPages: 0,
          totalItems: 0
        },
        data: []
      });
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query for active tournaments
    // Active tournaments are those that:
    // 1. Haven't ended yet (endDate >= today)
    // 2. User is registered in
    // 3. Tournament is active (if you have isActive field on Tournament model)
    const tournamentQuery = {
      _id: { $in: tournamentIds },
      endDate: { $gte: currentDate }
      // Uncomment below if you have isActive field on Tournament model
      // isActive: true
    };

    // Fetch tournaments and total count in parallel
    const [tournaments, total] = await Promise.all([
      Tournament.find(tournamentQuery)
        .sort({ startDate: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Tournament.countDocuments(tournamentQuery)
    ]);

    // Enrich tournament data with user-specific information
    const enrichedTournaments = await Promise.all(
      tournaments.map(async (tournament) => {
        // Get user's registration details
        const userRegistration = await TournamentPlayer.findOne({
          tournamentId: tournament._id,
          playerId: userObjectId,
          isActive: true
        })
        .populate('pairId')
        .lean();

        // Get user's pair information if exists
        let pairInfo = null;
        if (userRegistration?.pairId) {
          const pair = await TournamentPair.findById(userRegistration.pairId)
            .populate('player1 player2', 'firstName lastName email profileImage')
            .lean();
          pairInfo = pair;
        }

        // Get user's matches in this tournament
        const userPairs = await TournamentPair.find({
          tournamentId: tournament._id,
          $or: [
            { player1: userObjectId },
            { player2: userObjectId }
          ],
          isActive: true
        }).select('_id');

        const pairIds = userPairs.map(p => p._id);

        const userMatches = await Match.find({
          tournamentId: tournament._id,
          $or: [
            { matchType: 'Single', player1Id: userObjectId },
            { matchType: 'Single', player2Id: userObjectId },
            { matchType: 'Pair', pair1Id: { $in: pairIds } },
            { matchType: 'Pair', pair2Id: { $in: pairIds } }
          ]
        })
        .select('status matchType date teeTime winnerPlayerId winnerTeamId')
        .lean();

        // Calculate match statistics
        const matchStats = {
          total: userMatches.length,
          completed: userMatches.filter(m => m.status === 'Completed').length,
          upcoming: userMatches.filter(m => m.status === 'Upcoming').length,
          inProgress: userMatches.filter(m => m.status === 'In Progress').length,
          wins: userMatches.filter(m => 
            m.winnerPlayerId?.toString() === userId || 
            pairIds.some(pairId => pairId.toString() === m.winnerTeamId?.toString())
          ).length
        };

        // Determine tournament status
        let tournamentStatus = 'Upcoming';
        if (currentDate >= new Date(tournament.startDate) && currentDate <= new Date(tournament.endDate)) {
          tournamentStatus = 'Ongoing';
        } else if (currentDate < new Date(tournament.startDate)) {
          tournamentStatus = 'Upcoming';
        }

        // Calculate days until/since start
        const daysUntilStart = Math.ceil((new Date(tournament.startDate) - currentDate) / (1000 * 60 * 60 * 24));
        const daysRemaining = Math.ceil((new Date(tournament.endDate) - currentDate) / (1000 * 60 * 60 * 24));

        return {
          ...tournament,
          tournamentStatus,
          daysUntilStart: daysUntilStart > 0 ? daysUntilStart : 0,
          daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
          userRegistration: {
            registeredAt: userRegistration?.registeredAt,
            handicap: userRegistration?.handicap,
            pairId: userRegistration?.pairId,
            assignMatch: userRegistration?.assignMatch
          },
          pairInfo,
          matchStats
        };
      })
    );

    // Calculate overall statistics
    const stats = {
      total: total,
      returned: enrichedTournaments.length,
      ongoing: enrichedTournaments.filter(t => t.tournamentStatus === 'Ongoing').length,
      upcoming: enrichedTournaments.filter(t => t.tournamentStatus === 'Upcoming').length
    };

    return res.status(200).json({
      success: true,
      message: 'Active tournaments retrieved successfully',
      stats,
      pagination: {
        currentPage: parseInt(page),
        pageSize: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total
      },
      data: enrichedTournaments
    });

  } catch (error) {
    console.error('Error fetching user active tournaments:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching user active tournaments',
      error: error.message
    });
  }
};