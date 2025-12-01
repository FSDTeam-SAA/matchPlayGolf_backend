import tournamentService from "./tournament.service.js";
import Tournament from "./tournament.model.js";
import sendEmail from '../../lib/sendEmail.js';
import User from "../user/user.model.js";
import TournamentPair from "../others/tournamentPair.model.js";
import TournamentPlayer from "../others/tournamentPlayer.model.js";
import Round from "../round/round.model.js";

/**
 * @desc    Create a new tournament
 * @route   POST /api/tournaments
 * @access  Private
 */
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

    // Validation
    if (!tournamentName) {
      return res.status(400).json({
        success: false,
        message: "Tournament name is required"
      });
    }

    // Validate drawFormat
    if (drawFormat && !["Matrix", "Knockout", "Teams"].includes(drawFormat)) {
      return res.status(400).json({
        success: false,
        message: "Invalid draw format. Must be Matrix, Knockout, or Teams"
      });
    }

    // Validate format
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

/**
 * @desc    Get all tournaments with pagination and filtering
 * @route   GET /api/tournaments
 * @access  Public
 */
export const getAllTournaments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sportName,
      drawFormat,
      format,
      paymentStatus
    } = req.query;

    const filters = {
      sportName,
      drawFormat,
      format,
      paymentStatus
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

/**
 * @desc    Get tournament by ID
 * @route   GET /api/tournaments/:id
 * @access  Public
 */
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

/**
 * @desc    Update tournament
 * @route   PUT /api/tournaments/:id
 * @access  Private
 */
// export const updateTournament = async (req, res) => {
//   try {
    
//     const updateData = req.body;
//     const result = await tournamentService.updateTournament(
//       req.params.id,
//       updateData,
//       req.user._id,
//       req.user.role
//     );

//     res.status(200).json({
//       success: true,
//       data: result.tournamentData,
//       players: result.players,
//       rounds: result.setRounds,
//       message: "Tournament updated successfully"
//     });
//   } catch (error) {
//     const statusCode = error.message.includes("not found")
//       ? 404
//       : error.message.includes("Not authorized")
//       ? 403
//       : 500;

//     res.status(statusCode).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

export const updateTournament = async (req, res) => {
  try {
    const { status, rules, round, players } = req.body;
    const tournamentId = req.params.tournamentId;

    // if (!players || players.length === 0) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "At least one player is required.",
    //   });
    // }

    // -----------------------------------
    // STEP 0: Get Tournament and check format
    // -----------------------------------
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: "Tournament not found",
      });
    }

    const format = tournament.format; // "Single" or "Pair"

    // -----------------------------------
    // STEP 0B: Validate number of players
    // -----------------------------------
    if (format === "Single" && players.length !== 1) {
      return res.status(400).json({
        success: false,
        message: "Single format tournament allows only 1 player at a time",
      });
    }

    if (format === "Pair" && players.length !== 2) {
      return res.status(400).json({
        success: false,
        message: "Pair format tournament requires exactly 2 players",
      });
    }

    const createdUserIds = [];

    // -----------------------------------
    // STEP 1: CREATE OR GET USERS
    // -----------------------------------
    for (const p of players) {
      let user = await User.findOne({ email: p.email });

      if (!user) {
        user = await User.create({
          fullName: p.fullName,
          email: p.email,
          phone: p.phone,
        });
      }
      createdUserIds.push(user._id);
    }

    let pair = null;

    // -----------------------------------
    // STEP 2: PAIR REGISTRATION (2 players only)
    // -----------------------------------
    if (format === "Pair") {
      pair = await TournamentPair.create({
        tournamentId,
        teamName: `${players[0].fullName} & ${players[1].fullName}`,
        player1: createdUserIds[0],
        player2: createdUserIds[1],
      });

      // INSERT ONLY PAIR ID in TournamentPlayer
      await TournamentPlayer.create({
        tournamentId,
        playerId: null,
        pairId: pair._id,
      });
    }

    // -----------------------------------
    // STEP 3: SINGLE PLAYER REGISTRATION
    // -----------------------------------
    if (format === "Single") {
      await TournamentPlayer.create({
        tournamentId,
        playerId: createdUserIds[0],
        pairId: null,
      });
    }

    // -----------------------------------
    // STEP 4: UPDATE TOURNAMENT TABLE
    // -----------------------------------
    const updateData = {
      status: status || tournament.status || "Active",
    };

    if (rules) updateData.rules = rules;

    if (format === "Single") {
      updateData.$addToSet = { players: createdUserIds[0] };
    }

    if (format === "Pair" && pair) {
      updateData.$addToSet = { pairs: pair._id };
    }

    await Tournament.findByIdAndUpdate(tournamentId, updateData, { new: true });

    // -----------------------------------
    // STEP 5: CREATE ROUND
    // -----------------------------------
    if (round && round.length > 0) {
      for (const r of round) {
        await Round.create({
          tournamentId,
          roundName: "Round 1",
          roundNumber: 1,
          date: r.date,
          status: "Scheduled",
          createdBy: createdUserIds[0],
        });
      }
    }

    return res.status(201).json({
      success: true,
      message:
        format === "Pair"
          ? "Pair registration + Tournament updated successfully"
          : "Single player registration + Tournament updated successfully",
      data: {
        users: createdUserIds,
        pair: pair || null,
      },
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete tournament
 * @route   DELETE /api/tournaments/:id
 * @access  Private
 */
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

/**
 * @desc    Get tournaments by creator
 * @route   GET /api/tournaments/creator/me
 * @access  Private
 */
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
    const registeredUsers = await RegisterUser
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