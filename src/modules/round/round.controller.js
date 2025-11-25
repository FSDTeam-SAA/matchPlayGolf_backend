import roundService from "./round.service.js";

/**
 * @desc    Create a new round
 * @route   POST /api/rounds
 * @access  Private
 */
export const createRound = async (req, res) => {
  try {
    const { tournamentId, roundName, roundNumber, date, status } = req.body;

    // Validation
    if (!tournamentId || !roundName || !roundNumber || !date) {
      return res.status(400).json({
        success: false,
        message: "Tournament ID, round name, round number, date, and course ID are required"
      });
    }

    // Validate status
    if (status && !["Scheduled", "In Progress", "Completed", "Cancelled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be Scheduled, In Progress, Completed, or Cancelled"
      });
    }

    const roundData = {
      tournamentId,
      roundName,
      roundNumber,
      date,
      status: status || "Scheduled",
      createdBy: req.user._id
    };

    const round = await roundService.createRound(roundData);

    res.status(201).json({
      success: true,
      data: round,
      message: "Round created successfully"
    });
  } catch (error) {
    const statusCode = error.message.includes("already exists") ? 409 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Get all rounds with pagination and filtering
 * @route   GET /api/rounds
 * @access  Public
 */
export const getAllRounds = async (req, res) => {
  try {
    const { page = 1, limit = 10, tournamentId, status } = req.query;

    const filters = {
      tournamentId,
      status
    };

    const result = await roundService.getAllRounds(filters, parseInt(page), parseInt(limit));

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
 * @desc    Get round by ID
 * @route   GET /api/rounds/:id
 * @access  Public
 */
export const getRoundById = async (req, res) => {
  try {
    const round = await roundService.getRoundById(req.params.id);

    res.status(200).json({
      success: true,
      data: round
    });
  } catch (error) {
    const statusCode = error.message === "Round not found" ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Get rounds by tournament
 * @route   GET /api/rounds/tournament/:tournamentId
 * @access  Public
 */
export const getRoundsByTournament = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const result = await roundService.getRoundsByTournament(req.params.tournamentId, parseInt(page), parseInt(limit));

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
 * @desc    Update round
 * @route   PUT /api/rounds/:id
 * @access  Private
 */
export const updateRound = async (req, res) => {
  try {
    const updateData = req.body;
    const round = await roundService.updateRound(req.params.id, updateData, req.user._id, req.user.role);

    res.status(200).json({
      success: true,
      data: round,
      message: "Round updated successfully"
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
 * @desc    Delete round
 * @route   DELETE /api/rounds/:id
 * @access  Private
 */
export const deleteRound = async (req, res) => {
  try {
    const result = await roundService.deleteRound(req.params.id, req.user._id, req.user.role);

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