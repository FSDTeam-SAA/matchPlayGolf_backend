import matchService from "./match.service.js";

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

    const match = await matchService.createTournamentMatch(matchData);

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

    const result = await matchService.getAllTournamentMatches(filters, parseInt(page), parseInt(limit));

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

/**
 * @desc    Update match
 * @route   PUT /api/matches/:id
 * @access  Private
 */
export const updateTournamentMatch = async (req, res) => {
  try {
    const updateData = req.body;
    const match = await matchService.updateTournamentMatch(
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
export const updateTournamentMatchScores = async (req, res) => {
  try {
    const scoresData = req.body;
    const match = await matchService.updateTournamentMatchScores(
      req.params.matchId,
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
//Bismillah
export const deleteTournamentMatch = async (req, res) => {
  try {
    const result = await matchService.deleteTournamentMatch(
      req.params.matchId,
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