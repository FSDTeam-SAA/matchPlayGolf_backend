import matchService from "./match.service.js";
import { emitMatchNotification } from "../notification/notification.controller.js";

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
      teeTime,
      startingHole,
      groupNumber,
      status
    } = req.body;

    // Validation
    if (!tournamentId || !roundId || !matchType) {
      return res.status(400).json({
        success: false,
        message: "Tournament ID, round ID, and match type are required"
      });
    }

    // Match type validation (case-sensitive to match schema)
    if (!["Single", "Pair"].includes(matchType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid match type. Must be 'Single' or 'Pair'"
      });
    }

    // Single match validation
    if (matchType === "Single" && (!player1Id || !player2Id)) {
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
    if (status && !["Upcoming", "In Progress", "Completed", "Cancelled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'Upcoming', 'In Progress', 'Completed', or 'Cancelled'"
      });
    }

    const matchData = {
      tournamentId,
      roundId,
      matchType,
      status: status || "Upcoming",
      createdBy: req.user._id,
      ...(teeTime && { teeTime }),
      ...(startingHole && { startingHole }),
      ...(groupNumber && { groupNumber })
    };

    // Add type-specific fields
    if (matchType === "Single") {
      matchData.player1Id = player1Id;
      matchData.player2Id = player2Id;
    } else if (matchType === "Pair") {
      matchData.pair1Id = pair1Id;
      matchData.pair2Id = pair2Id;
    }

    const match = await matchService.createTournamentMatch(matchData);

    // 🔥 EMIT SOCKET NOTIFICATION - ONLY TO MATCH PARTICIPANTS
    const io = req.app.get('io');
    if (io) {
      emitMatchNotification(io, 'MATCH_CREATED', match);
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
    if (updateData.status && !["Upcoming", "In Progress", "Completed", "Cancelled"].includes(updateData.status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'Upcoming', 'In Progress', 'Completed', or 'Cancelled'"
      });
    }

    // Validate matchType if provided
    if (updateData.matchType && !["Single", "Pair"].includes(updateData.matchType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid match type. Must be 'Single' or 'Pair'"
      });
    }

    const match = await matchService.updateTournamentMatch(
      req.params.id,
      updateData,
      req.user._id,
      req.user.role
    );

    // 🔥 EMIT SOCKET NOTIFICATION - ONLY TO MATCH PARTICIPANTS
    const io = req.app.get('io');
    if (io) {
      emitMatchNotification(io, 'MATCH_UPDATED', match);
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
    const io = req.app.get('io');
    if (io) {
      emitMatchNotification(io, 'MATCH_UPDATED', match);
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
    const io = req.app.get('io');
    if (io) {
      emitMatchNotification(io, 'MATCH_DELETED', match);
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
      tournamentId,
      roundId,
      matchType,
      status
    } = req.query;

    const filters = {
      tournamentId,
      roundId,
      matchType,
      status
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