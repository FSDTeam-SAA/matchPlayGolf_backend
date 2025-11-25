import matchService from "./match.service.js";

/**
 * @desc    Create a new match
 * @route   POST /api/matches
 * @access  Private
 */
export const createMatch = async (req, res) => {
  try {
    const {
      tournamentId,
      roundId,
      matchType,
      players,
      teams,
      status
    } = req.body;

    // Validation
    if (!tournamentId || !roundId || !matchType) {
      return res.status(400).json({
        success: false,
        message: "Tournament ID, round ID, match type, and tee time are required"
      });
    }

    // Validate matchType
    if (!["single", "pair", "team"].includes(matchType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid match type. Must be single, pair, or team"
      });
    }

    // Validate status
    if (status && !["Scheduled", "In Progress", "Completed", "Cancelled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be Scheduled, In Progress, Completed, or Cancelled"
      });
    }

    const matchData = {
      tournamentId,
      roundId,
      matchType,
      players: matchType === "single" ? players : [],
      teams: ["pair", "team"].includes(matchType) ? teams : [],
      status: status || "Scheduled",
      createdBy: req.user._id
    };

    const match = await matchService.createMatch(matchData);

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
 * @desc    Get all matches with pagination and filtering
 * @route   GET /api/matches
 * @access  Public
 */
export const getAllMatches = async (req, res) => {
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

    const result = await matchService.getAllMatches(filters, parseInt(page), parseInt(limit));

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
export const getMatchById = async (req, res) => {
  try {
    const match = await matchService.getMatchById(req.params.id);

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
export const getMatchesByRound = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const result = await matchService.getMatchesByRound(
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

/**
 * @desc    Update match
 * @route   PUT /api/matches/:id
 * @access  Private
 */
export const updateMatch = async (req, res) => {
  try {
    const updateData = req.body;
    const match = await matchService.updateMatch(
      req.params.id,
      updateData,
      req.user._id,
      req.user.role
    );

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
 * @route   PATCH /api/matches/:id/scores
 * @access  Private
 */
export const updateMatchScores = async (req, res) => {
  try {
    const scoresData = req.body;
    const match = await matchService.updateMatchScores(
      req.params.id,
      scoresData,
      req.user._id
    );

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
 * @route   DELETE /api/matches/:id
 * @access  Private
 */
export const deleteMatch = async (req, res) => {
  try {
    const result = await matchService.deleteMatch(
      req.params.id,
      req.user._id,
      req.user.role
    );

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
=======
// src/modules/match/match.controller.js
import {
  createMatchService,
  getMatchesService,
  getMatchByIdService,
  updateMatchService,
  deleteMatchService,
} from './match.service.js';

// ======= CREATE MATCH =======
export const createMatch = async (req, res) => {
  try {
    const userId = req.user?._id;
    const match = await createMatchService(userId, req.body, req.file || null);

    return res.status(201).json({
      success: true,
      message: 'Match created successfully',
      data: match,
    });
  } catch (error) {
    console.error('Create match error:', error);

    if (error.code === 'INVALID_DATE' || error.code === 'INVALID_SCORE') {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// ======= GET ALL MATCHES FOR LOGGED-IN USER =======
export const getMatches = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { page, limit } = req.query;

    const result = await getMatchesService(userId, { page, limit });

    return res.status(200).json({
      success: true,
      message: 'Matches fetched successfully',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Get matches error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// ======= GET SINGLE MATCH =======
export const getMatchById = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;

    const match = await getMatchByIdService(userId, id);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Match fetched successfully',
      data: match,
    });
  } catch (error) {
    console.error('Get match error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// ======= UPDATE MATCH =======
export const updateMatch = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;

    const updatedMatch = await updateMatchService(
      userId,
      id,
      req.body,
      req.file || null
    );

    if (!updatedMatch) {
      return res.status(404).json({
        success: false,
        message: 'Match not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Match updated successfully',
      data: updatedMatch,
    });
  } catch (error) {
    console.error('Update match error:', error);

    if (error.code === 'INVALID_DATE' || error.code === 'INVALID_SCORE') {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// ======= DELETE MATCH =======
export const deleteMatch = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;

    const deleted = await deleteMatchService(userId, id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Match not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Match deleted successfully',
    });
  } catch (error) {
    console.error('Delete match error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
