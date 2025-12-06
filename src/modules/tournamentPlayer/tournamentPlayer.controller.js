// src/controllers/tournamentPlayer.controller.js
import TournamentPlayerService from './tournamentPlayer.service.js';

class TournamentPlayerController {
  /**
   * Get all players (Admin: all players, Organizer: only their tournament players)
   * GET /api/players
   */
  async getAllPlayers(req, res) {
    try {
      const { tournamentId, isActive, assignMatch } = req.query;
      const userId = req.user._id;
      const userRole = req.user.role;

      const filters = {
        ...(tournamentId && { tournamentId }),
        ...(isActive !== undefined && { isActive: isActive === 'true' }),
        ...(assignMatch !== undefined && { assignMatch: assignMatch === 'true' }),
      };

      const players = await TournamentPlayerService.getAllPlayers(
        userId,
        userRole,
        filters
      );

      res.status(200).json({
        success: true,
        count: players.length,
        data: players,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get players for a specific tournament
   * GET /api/tournaments/:tournamentId/players
   */
  async getPlayersByTournament(req, res) {
    try {
      const { tournamentId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const players = await TournamentPlayerService.getPlayersByTournament(
        tournamentId,
        userId,
        userRole
      );

      res.status(200).json({
        success: true,
        count: players.length,
        data: players,
      });
    } catch (error) {
      res.status(error.message.includes('not found') || error.message.includes('unauthorized') ? 404 : 500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get single player by ID
   * GET /api/players/:playerId
   */
  async getPlayerById(req, res) {
    try {
      const { playerId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const player = await TournamentPlayerService.getPlayerById(
        playerId,
        userId,
        userRole
      );

      res.status(200).json({
        success: true,
        data: player,
      });
    } catch (error) {
      res.status(error.message.includes('not found') || error.message.includes('Unauthorized') ? 404 : 500).json({
        success: false,
        message: error.message,
      });
    }
  }
  async deletePlayer(req, res) {
    try {
      const { playerId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const result = await TournamentPlayerService.deletePlayer(
        playerId,
        userId,
        userRole
      );

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      res.status(error.message.includes('not found') || error.message.includes('Unauthorized') ? 404 : 500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Toggle player active status
   * PATCH /api/players/:playerId/toggle-status
   */
  async togglePlayerStatus(req, res) {
    try {
      const { playerId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const player = await TournamentPlayerService.togglePlayerStatus(
        playerId,
        userId,
        userRole
      );

      res.status(200).json({
        success: true,
        message: `Player ${player.isActive ? 'activated' : 'deactivated'} successfully`,
        data: player,
      });
    } catch (error) {
      res.status(error.message.includes('not found') || error.message.includes('Unauthorized') ? 404 : 500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get player statistics for a tournament
   * GET /api/tournaments/:tournamentId/players/stats
   */
  async getPlayerStats(req, res) {
    try {
      const { tournamentId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const stats = await TournamentPlayerService.getPlayerStats(
        tournamentId,
        userId,
        userRole
      );

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      res.status(error.message.includes('Unauthorized') ? 403 : 500).json({
        success: false,
        message: error.message,
      });
    }
  }

}

export default new TournamentPlayerController();