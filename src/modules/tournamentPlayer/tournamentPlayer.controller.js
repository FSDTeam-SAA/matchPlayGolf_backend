// src/controllers/tournamentPlayer.controller.js
import tournamentPlayer from '../others/tournamentPlayer.model.js';
import tournamentService from '../tournament/tournament.service.js';
import TournamentPlayerService from './tournamentPlayer.service.js';

class TournamentPlayerController {


async getAllPlayers (req, res){
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    const result = await TournamentPlayerService.getAllPlayers(
      userId,
      userRole,
      req.query
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error("❌ Get players error:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

 
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

  async getPlayerById(req, res) {
    try {
      const { playerId } = req.params;
      const userId = req.user._id;
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
      const userId = req.user._id;
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
  // async updatePlayer (req, res){

  //   try{
  //     const updateData = req.body;
  //     const { playerId } = req.params;
  //     const userId = req.user._id;
  //     const userRole = req.user.role;
  //     // console.log("Received update data:", updateData);

  //     const updatePlayer = await TournamentPlayerService.updatePlayer(playerId, updateData, userId, userRole);
      
  //     return res.status(201).json({
  //       success:true,
  //       message: "Player data updated successfully",
  //       updateData: updatePlayer,
  //     })
  //   }
  //   catch(err){
  //     res.status(500).json({
  //       success:false,
  //       message:"Provide correct information"
  //     })
  //   }
  // }
  async updatePlayer(req, res) {
  try {
    const updateData = req.body;
    const { playerId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const updatedPlayer =
      await TournamentPlayerService.updatePlayer(
        playerId,
        updateData,
        userId,
        userRole
      );

    return res.status(200).json({
      success: true,
      message: "Player data updated successfully",
      data: updatedPlayer,
    });
  } catch (err) {
    console.error("Update player error:", err.message);

    return res.status(400).json({
      success: false,
      message: err.message || "Failed to update player",
    });
  }
}
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