import tournamentService from "./tournament.service.js";
import Tournament from "./tournament.model.js";
import sendEmail from '../../lib/sendEmail.js';
import TournamentPlayer from "../others/tournamentPlayer.model.js";


export const createTournament = async (req, res) => {
  try {
    const {
      tournamentName,
      sportName,
      drawFormat,
      format,
      drawSize,
      billingAddress,
      price
    } = req.body;

    if (!tournamentName) {
      return res.status(400).json({
        success: false,
        message: "Tournament name is required"
      });
    }

    if (drawFormat && !["Knockout", "Teams"].includes(drawFormat)) {
      return res.status(400).json({
        success: false,
        message: "Invalid draw format. Must be Matrix, Knockout, or Teams"
      });
    }

    if (format && !["Single", "Pair", "Team"].includes(format)) {
      return res.status(400).json({
        success: false,
        message: "Invalid format. Must be Single, Pair, or Team"
      });
    }

    const orderCode = await generateUniqueOrderCode();

    const tournamentData = {
      tournamentName,
      sportName: sportName || "golf",
      drawFormat: drawFormat || "Matrix",
      format: format || "Single",
      drawSize: drawSize || 16,
      billingAddress,
      price,
      createdBy: req.user._id,
      paymentStatus: "pending",
      orderId: orderCode,
    };

    const { tournamentDetails, payment} = await tournamentService.createTournament(tournamentData);

    res.status(201).json({
      success: true,
      orderDetails: tournamentDetails,
      paymentDetails: payment,
      message: "Tournament created successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getAllTournaments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sportName,
      drawFormat,
      format,
      tournamentName,
      location,
      paymentStatus,
      status
    } = req.query;

    const filters = {
      sportName,
      drawFormat,
      format,
      tournamentName,
      location,
      paymentStatus,
      status
    };

    const result = await tournamentService.getAllTournaments(
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

export const getTournamentById = async (req, res) => {
  try {
    const tournament = await tournamentService.getTournamentById(req.params.id);

    res.status(200).json({
      success: true,
      data: tournament
    });
  } catch (error) {
    const statusCode = error.message === "Tournament not found" ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
};

export const updateTournament = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const updateData = req.body;
    
    // Validate tournament ID
    if (!tournamentId) {
      return res.status(400).json({
        success: false,
        message: "Tournament ID is required",
      });
    }
    
    // Call service
    const result = await tournamentService.updateTournamentService(tournamentId, updateData,  req.user._id,
      req.user.role);
    
    // Build response message
    let message = "Tournament updated successfully";
    if (result.registration) {
      const regType = result.registration.type === "pair" ? "Pair" : "Single player";
      message = `${regType} registration + Tournament updated successfully`;
    }
    
    return res.status(200).json({
      success: true,
      message,
      data: {
        tournament: result.tournament,
        registration: result.registration,
        rounds: result.rounds,
      },
    });
    
  } catch (error) {
    console.error("TOURNAMENT UPDATE ERROR:", error);
    
    // Handle specific errors
    if (error.message === "Tournament not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    
    if (
      error.message.includes("format") || 
      error.message.includes("player")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    
    // Generic error
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const deleteTournament = async (req, res) => {
  try {
    const result = await tournamentService.deleteTournament(
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

export const getTournamentsByCreator = async (req, res) => {
  try {
    const { page = 1, limit = 10, paymentStatus } = req.query;
    const creatorId = req.user._id;

    const filters = { paymentStatus };

    const result = await tournamentService.getTournamentsByCreator(
      creatorId,
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

export const generateUniqueOrderCode = async () => {
    let unique = false;
    let orderCode;

    while (!unique) {
      orderCode = "Order - " + Math.floor(100000 + Math.random() * 900000);

      // Check code exists or not
      const exists = await Tournament.findOne({ orderCode });

      if (!exists) {
        unique = true;
      }
    }

    return orderCode;
  };


  export const sendInvitationRegisteredUsers = async (req, res) => {
  try {
    const tournamentId  = req.params.id;

    // ✅ Check tournament exists
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: "Tournament not found",
      });
    }

    // ✅ Find all registered users for this tournament
    const registeredUsers = await TournamentPlayer
      .find({ tournamentId })
      .populate("userId", "fullName email");

    if (registeredUsers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No users registered for this tournament",
      });
    }

    // ===============================
    //  EMAIL SENDING FOR EACH USER
    // ===============================
    for (const regUser of registeredUsers) {
      const user = regUser.userId;

      if (user?.email) {
        // 👇 Replace with your actual email sending logic
        await sendEmail({
          to: user.email,
          subject: `Tournament Invitation: ${tournament.name}`,
          html: `
            <h3>Hello ${user.fullName},</h3>
            <p>You are invited to participate in the tournament <strong>${tournament.name}</strong>.</p>
            <p>Date: ${tournament.date}</p>
          `,
        });
      }
    }

    // ===============================
    //  SUCCESS RESPONSE
    // ===============================
    res.json({
      success: true,
      message: "Invitations sent to all registered users",
      totalUsers: registeredUsers.length,
    });
  } catch (error) {
    console.error("Send Invitation Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};



export const findTournamentPlayer = async (req, res) => {
  try {
    const tournamentId = req.params.tournamentId;

    if (!tournamentId) {
      return res.status(400).json({
        success: false,
        message: "Tournament ID is required",
      });
    }

    // Fetch all players for this tournament
    const players = await TournamentPlayer.find({ tournamentId, isActive: true, assignMatch:true })
      .populate("playerId", "fullName email phone handicap clubName")
      .populate({
        path: "pairId",
        select: "teamName player1 player2",
        populate: [
          { path: "player1", select: "fullName email phone" },
          { path: "player2", select: "fullName email phone" },
        ],
      })
      .sort({ createdAt: -1 }); // latest first

    return res.status(200).json({
      success: true,
      message: "Tournament players fetched successfully",
      data: players,
    });
  } catch (error) {
    console.error("Find tournament player error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};


export const getTournamentMatchesController = async (req, res) => {
  try {
    const { tournamentId } = req.params;

    const matches = await tournamentService.getTournamentMatchesService(tournamentId);

    return res.status(200).json({
      success: true,
      message: "Tournament matches fetched successfully",
      data: matches,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
