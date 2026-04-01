import tournamentService from "./tournament.service.js";
import Tournament from "./tournament.model.js";
import sendEmail from '../../lib/sendEmail.js';
import TournamentPlayer from "../others/tournamentPlayer.model.js";
import User from "../user/user.model.js";
import Round from "../round/round.model.js";
import { parse } from 'csv-parse/sync';
import { invitetationEmailTemplate, eventStartInvitationTemplate } from "../../lib/emailTemplates.js";
import crypto from "crypto";
import Match from "../match/match.model.js";
import KnockoutStage from '../others/knockoutSchema.model.js';
import { initializeKnockout, generateNextRound } from './autometicRound.controller.js';
import mongoose from "mongoose";


function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}
export const progressTournament = async (req, res,next) => {
  try {
    const { tournamentId } = req.params;
    const userId = req.user._id;
    const role = req.user.role;

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    if(role == "Admin"){
      tournament.tournamentStatus = "approved";
      await tournament.save();
    }
   if (tournament.tournamentStatus !== "approved") {
    return res.status(403).json({
      success: false,
      message: "You are not allowed to create a tournament unless it is approved."
    });
  }

    const knockoutStage = await KnockoutStage.findOne({ tournamentId });
    console.log(tournament);
    if (tournament.onHold == true) {
      console.log(tournament, "2347890==-=908087767");
        return res.status(500).json({
          success: false,
          message: "This tournament currently on hold so you not allowed for tournament initializeKnockout"
        });
      }
    if (!knockoutStage) {

      const initializeKnockoutResult = await initializeKnockout(tournamentId, userId);

      return res.status(200).json({
        message: 'Tournament initialized and first round created',
        data: initializeKnockoutResult
      });
    }

    const nextRound = await generateNextRound(tournamentId, userId);

    return res.status(200).json({
      message: 'Next round generated successfully',
      data: nextRound
    });

  } catch (error) {
    return next(error);
  }
};
export const createTournament = async (req, res) => {
  try {
    const {
      tournamentName,
      sportName,
      drawFormat,
      format,
      drawSize,
      billingAddress,
      price,
      numberOfSeeds
    } = req.body;
 
    const userId = req.user._id;
    const user = await User.findById(userId);
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

    if (format && !["Single", "Pairs", "Team"].includes(format)) {
      return res.status(400).json({
        success: false,
        message: "Invalid format. Must be Single, Pair, or Team"
      });
    }

    const orderCode = await generateUniqueOrderCode();

    const tournamentData = {
      tournamentName,
      sportName: sportName || "golf",
      drawFormat: drawFormat || "Knockout",
      format: format || "Single",
      drawSize: drawSize || 16,
      billingAddress,
      price,
      createdBy: req.user._id,
      paymentStatus: "pending",
      orderId: orderCode,
      role: user.role,
      numberOfSeeds: numberOfSeeds || 0
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
    const result = await tournamentService.getTournamentById(req.params.id);

    res.status(200).json({
      success: true,
      data: result
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
    let updateData = { ...req.body };
    let allPlayers = [];
    
    if (!tournamentId) {
      return res.status(400).json({
        success: false,
        message: "Tournament ID is required",
      });
    }
    
    if (req.body.players) {
      const jsonPlayers = typeof req.body.players === 'string' 
        ? JSON.parse(req.body.players) 
        : req.body.players;
      allPlayers = [...jsonPlayers];
    }
    
    if (req.file && req.file.mimetype === 'text/csv') {
      try {
        const csvData = req.file.buffer.toString('utf-8');
        const records = parse(csvData, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });
        
        if (!records || records.length === 0) {
          return res.status(400).json({
            success: false,
            message: "CSV file is empty or invalid",
          });
        }
        
        const csvPlayers = records.map(record => ({
          fullName: record.fullName || record.name || '',
          email: record.email || '',
          phone: record.phone || '',
        }));
        
        for (let i = 0; i < csvPlayers.length; i++) {
          if (!csvPlayers[i].fullName || !csvPlayers[i].email) {
            return res.status(400).json({
              success: false,
              message: `CSV Row ${i + 1}: fullName and email are required`,
            });
          }
        }
        
        allPlayers = [...allPlayers, ...csvPlayers];
        
      } catch (csvError) {
        return res.status(400).json({
          success: false,
          message: "Failed to parse CSV file",
          error: csvError.message,
        });
      }
    }
    
    if (allPlayers.length > 0) {
      updateData.players = allPlayers;
    }
    
    const result = await tournamentService.updateTournamentService(
      tournamentId, 
      updateData,  
      req.user._id,
      req.user.role
    );
    
    let message = "Tournament updated successfully";
    if (result.registration) {
      const count = result.registration.users.length;
      const regType = result.registration.type === "pair" ? "Pairs" : "Single player";
      message = `${count} ${regType} registration(s) + Tournament updated successfully`;
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
    const creatorId = req.user._id;

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

    const result = await tournamentService.getTournamentsByCreator(
      creatorId,
      filters,
      Number(page),
      Number(limit)
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
    const tournamentId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(tournamentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tournament ID"
      });
    }

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: "Tournament not found"
      });
    }

    const knockoutStage = await KnockoutStage.findOne({ tournamentId });
    if (!knockoutStage) {
      return res.status(404).json({
        success: false,
        message: "Knockout stage not found"
      });
    }

    const currentRound = knockoutStage.currentRound;

    const matches = await Match.find({
      tournamentId,
      round: currentRound
    })
      .populate("player1Id", "fullName email")
      .populate("player2Id", "fullName email")
      .populate({
        path: "pair1Id",
        populate: { path: "player1 player2", select: "fullName email" }
      })
      .populate({
        path: "pair2Id",
        populate: { path: "player1 player2", select: "fullName email" }
      });

    if (matches.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No matches found for round ${currentRound}`
      });
    }

    const frontendUrl = process.env.FRONTEND_URL;
    let emailCount = 0;

    for (const match of matches) {
  
      const verifyToken = generateToken();

      match.verifyToken = verifyToken;
      match.updateResultUrl = `${frontendUrl}/match/${match._id}?token=${verifyToken}`;
      await match.save();

      const recipients = new Set();

      match.player1Id?.email && recipients.add(match.player1Id.email);
      match.player2Id?.email && recipients.add(match.player2Id.email);
      match.pair1Id?.player1?.email && recipients.add(match.pair1Id.player1.email);
      match.pair1Id?.player2?.email && recipients.add(match.pair1Id.player2.email);
      match.pair2Id?.player1?.email && recipients.add(match.pair2Id.player1.email);
      match.pair2Id?.player2?.email && recipients.add(match.pair2Id.player2.email);

      for (const email of recipients) {
        await sendEmail({
          to: email,
          subject: `Match Result Update: ${tournament.tournamentName}`,
          html: invitetationEmailTemplate({
            tournament,
            match,
            updateResultUrl: match.updateResultUrl
          })
        });
        emailCount++;
      }
    }

    return res.json({
      success: true,
      message: "Match links sent to current round players only",
      currentRound,
      totalMatches: matches.length,
      totalEmails: emailCount
    });

  } catch (error) {
    console.error("❌ Send Invitation Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message
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

    const players = await TournamentPlayer.find({ tournamentId, isActive: true, assignMatch:false })
      .populate("playerId", "fullName email phone handicap clubName")
      .populate({
        path: "pairId",
        populate: [
          { path: "player1", select: "fullName email phone handicap clubName" },
          { path: "player2", select: "fullName email phone handicap clubName" },
        ],
      })
      .sort({ createdAt: -1 }); 

      const rounds = await Round.find({ tournamentId });

      console.log("ROUNDS DATA:", rounds);

    return res.status(200).json({
      success: true,
      message: "Tournament players fetched successfully",
      data: players,
      rounds: rounds
    });
  } catch (error) {
    console.error("Find tournament player error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch tournament players",
    });
  }
};


export const getTournamentMatchesController = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { roundNumber, page = 1, limit = 10 } = req.query;

    const result = await tournamentService.getTournamentMatchesService(
      tournamentId,
      roundNumber,
      page,
      limit
    );

    return res.status(200).json({
      success: true,
      message: "Tournament matches fetched successfully",
      data: result,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const eventStartInvitationRegisteredUsers = async (req, res) => {
  try {
    const { tournamentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(tournamentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tournament ID"
      });
    }
    const tournament = await Tournament.findById(tournamentId);

    if (tournament.onHold == true) {
      console.log(tournament, "2347890==-=908087767");
        return res.status(500).json({
          success: false,
          message: "This tournament currently on hold so you not allowed for tournament start"
        });
      }

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: "Tournament not found"
      });
    }

    tournament.status = "in progress";
    await tournament.save();

    const knockoutStage = await KnockoutStage.findOne({ tournamentId });
    if (!knockoutStage) {
      return res.status(404).json({
        success: false,
        message: "Knockout stage not found"
      });
    }

    const currentRound = knockoutStage.currentRound;

    const matches = await Match.find({
      tournamentId,
      round: currentRound
    })
      .populate("player1Id player2Id", "fullName email")
      .populate({
        path: "pair1Id",
        populate: [
          { path: "player1", select: "fullName email" },
          { path: "player2", select: "fullName email" }
        ]
      })
      .populate({
        path: "pair2Id",
        populate: [
          { path: "player1", select: "fullName email" },
          { path: "player2", select: "fullName email" }
        ]
      });

    const emailMap = new Map();

    const addPlayer = (player) => {
      if (player?.email) {
        emailMap.set(player.email, player);
      }
    };

    for (const match of matches) {

      addPlayer(match.player1Id);
      addPlayer(match.player2Id);

      match.pair1Id?.player1 && addPlayer(match.pair1Id.player1);
      match.pair1Id?.player2 && addPlayer(match.pair1Id.player2);
      match.pair2Id?.player1 && addPlayer(match.pair2Id.player1);
      match.pair2Id?.player2 && addPlayer(match.pair2Id.player2);
    }

    const frontendUrl = process.env.FRONTEND_URL;
    let emailCount = 0;

    for (const [email] of emailMap) {
      await sendEmail({
        to: email,
        subject: `Event Started: ${tournament.tournamentName}`,
        html: eventStartInvitationTemplate({
          eventName: tournament.tournamentName,
          eventDrawUrl: `${frontendUrl}/tournaments/${tournamentId}`,
          dashboardUrl: `${frontendUrl}`,
          contactUrl: `${frontendUrl}/contact`,
          createEventUrl: `${frontendUrl}`
        })
      });
      emailCount++;
    }

    return res.json({
      success: true,
      message: "Emails sent to current round players only",
      currentRound,
      totalMatches: matches.length,
      totalEmails: emailCount
    });

  } catch (error) {
    console.error("❌ Send Invitation Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const approvedTournament = async (req, res) => {
  try {
    const role = req.user?.role;
    const { tournamentId } = req.params;
    const tournamentStatus = req.body.tournamentStatus;

    // Role check
    if (role !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to approve this tournament"
      });
    }

    // Tournament check
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: "Tournament not found"
      });
    }

    // Approve tournament
    tournament.tournamentStatus = tournamentStatus;
    const updateTournament = await tournament.save();

    return res.status(200).json({
      success: true,
      message: "Tournament approved successfully",
      data: updateTournament
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const handleCsvFile = async(req, res) => {
  try {
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'CSV file is required' });
    }

    const results = [];

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (row) => {
        results.push(row);
      })
      .on('end', async () => {
        for (const row of results) {
        
          const hashedPassword = await bcrypt.hash(row.password, 10);

          const userData = {
            name: row.name,
            email: row.email,
            password: hashedPassword
          };

          // Save to MongoDB
          await User.create(userData);
        }

        // Delete CSV file after processing
        fs.unlinkSync(req.file.path);

        res.status(200).json({ success: true, message: 'CSV data uploaded successfully' });
      });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}
