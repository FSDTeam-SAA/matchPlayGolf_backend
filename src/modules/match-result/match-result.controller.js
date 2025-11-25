// src/modules/match/match.controller.js
import {
  createMatchService,
  getMatchesService,
  getMatchByIdService,
  updateMatchService,
  deleteMatchService,
} from './match-result.service.js';

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