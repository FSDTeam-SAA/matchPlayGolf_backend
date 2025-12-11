// // controllers/knockoutController.js
// import Tournament from '../tournament/tournament.model.js';
// import TournamentPlayer from '../others/tournamentPlayer.model.js';

// // Initialize Knockout Stage
// export const initializeKnockout = async (req, res) => {
//   try {
//     const { tournamentId } = req.params;
//     // const { qualifiedPlayers } = req.body; // Array of player IDs
//     const tournament = await Tournament.findById(tournamentId);

//     if (!tournament) {
//       return res.status(404).json({ message: "Tournament not found" });
//     }

//     // 2️⃣ Auto-fetch all active registered players
//     const registeredPlayers = await TournamentPlayer.find({
//       tournamentId,
//       isActive: true,
//       assignMatch: true
//     }).select("playerId");

//     if (registeredPlayers.length === 0) {
//       return res.status(400).json({ message: "No registered players found" });
//     }

//     // Extract only IDs
//     const qualifiedPlayers = registeredPlayers.map(p => p.playerId.toString());

//     // Validate number of players (must be power of 2)
//     const playerCount = qualifiedPlayers.length;
//     if (!isPowerOfTwo(playerCount)) {
//       return res.status(400).json({ 
//         message: 'Number of qualified players must be a power of 2 (8, 16, 32, etc.)' 
//       });
//     }

//     // Calculate total rounds
//     const totalRounds = Math.log2(playerCount);
    
//     // Generate first round matches
//     const matches = generateFirstRoundMatches(qualifiedPlayers);

//     tournament.knockoutStage = {
//       isActive: true,
//       currentRound: 1,
//       totalRounds,
//       matches,
//       onHold: false
//     };

//     await tournament.save();

//     res.status(200).json({
//       message: 'Knockout stage initialized successfully',
//       knockoutStage: tournament.knockoutStage
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // Auto-generate next round matches
// export const generateNextRound = async (req, res) => {
//   try {
//     const { tournamentId } = req.params;
    
//     const tournament = await Tournament.findById(tournamentId)
//       .populate('knockoutStage.matches.player1')
//       .populate('knockoutStage.matches.player2')
//       .populate('knockoutStage.matches.winner');

//     if (!tournament || !tournament.knockoutStage.isActive) {
//       return res.status(400).json({ message: 'Knockout stage not active' });
//     }

//     const { currentRound, matches, totalRounds } = tournament.knockoutStage;

//     // Check if current round is complete
//     const currentRoundMatches = matches.filter(m => m.round === currentRound);
//     const allMatchesComplete = currentRoundMatches.every(m => m.status === 'completed' && m.winner);

//     if (!allMatchesComplete) {
//       return res.status(400).json({ 
//         message: 'Current round not complete. All matches must have winners.' 
//       });
//     }

//     // Check if tournament is complete
//     if (currentRound >= totalRounds) {
//       tournament.status = 'completed';
//       tournament.knockoutStage.isActive = false;
//       await tournament.save();
//       return res.status(200).json({ 
//         message: 'Tournament completed!',
//         winner: currentRoundMatches[0].winner 
//       });
//     }

//     // Generate next round matches
//     const nextRoundMatches = generateNextRoundMatches(currentRoundMatches, currentRound + 1);
    
//     tournament.knockoutStage.matches.push(...nextRoundMatches);
//     tournament.knockoutStage.currentRound += 1;

//     await tournament.save();

//     res.status(200).json({
//       message: `Round ${currentRound + 1} generated successfully`,
//       nextRoundMatches
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // Update match result and auto-advance winner
// export const updateMatchResult = async (req, res) => {
//   try {
//     const { tournamentId, matchId } = req.params;
//     const { winnerId, player1Score, player2Score } = req.body;

//     const tournament = await Tournament.findById(tournamentId);
    
//     if (!tournament) {
//       return res.status(404).json({ message: 'Tournament not found' });
//     }

//     const match = tournament.knockoutStage.matches.id(matchId);
    
//     if (!match) {
//       return res.status(404).json({ message: 'Match not found' });
//     }

//     // Update match details
//     match.winner = winnerId;
//     match.player1Score = player1Score;
//     match.player2Score = player2Score;
//     match.status = 'completed';

//     await tournament.save();

//     // Check if round is complete and auto-generate next round
//     const currentRound = tournament.knockoutStage.currentRound;
//     const currentRoundMatches = tournament.knockoutStage.matches.filter(m => m.round === currentRound);
//     const allComplete = currentRoundMatches.every(m => m.status === 'completed');

//     if (allComplete && currentRound < tournament.knockoutStage.totalRounds) {
//       // Auto-generate next round
//       const nextRoundMatches = generateNextRoundMatches(currentRoundMatches, currentRound + 1);
//       tournament.knockoutStage.matches.push(...nextRoundMatches);
//       tournament.knockoutStage.currentRound += 1;
//       await tournament.save();
//     }

//     res.status(200).json({
//       message: 'Match result updated successfully',
//       match,
//       autoAdvanced: allComplete
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };



// // Hold/Resume Tournament
// export const toggleTournamentHold = async (req, res) => {
//   try {
//     const { tournamentId } = req.params;
//     const { holdReason } = req.body;

//     const tournament = await Tournament.findById(tournamentId);
    
//     if (!tournament) {
//       return res.status(404).json({ message: 'Tournament not found' });
//     }

//     tournament.knockoutStage.onHold = !tournament.knockoutStage.onHold;
//     tournament.knockoutStage.holdReason = tournament.knockoutStage.onHold ? holdReason : null;

//     await tournament.save();

//     res.status(200).json({
//       message: tournament.knockoutStage.onHold ? 'Tournament on hold' : 'Tournament resumed',
//       knockoutStage: tournament.knockoutStage
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // Reschedule Match
// export const rescheduleMatch = async (req, res) => {
//   try {
//     const { tournamentId, matchId } = req.params;
//     const { scheduledDate, scheduledTime, venue, notes } = req.body;

//     const tournament = await Tournament.findById(tournamentId);
    
//     if (!tournament) {
//       return res.status(404).json({ message: 'Tournament not found' });
//     }

//     const match = tournament.knockoutStage.matches.id(matchId);
    
//     if (!match) {
//       return res.status(404).json({ message: 'Match not found' });
//     }

//     // Update schedule
//     match.scheduledDate = scheduledDate;
//     match.scheduledTime = scheduledTime;
//     match.venue = venue || match.venue;
//     match.notes = notes || match.notes;
//     match.status = 'rescheduled';

//     await tournament.save();

//     res.status(200).json({
//       message: 'Match rescheduled successfully',
//       match
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // Get Knockout Stage Details
// export const getKnockoutStage = async (req, res) => {
//   try {
//     const { tournamentId } = req.params;
    
//     const tournament = await Tournament.findById(tournamentId)
//       .populate('knockoutStage.matches.player1')
//       .populate('knockoutStage.matches.player2')
//       .populate('knockoutStage.matches.winner');

//     if (!tournament) {
//       return res.status(404).json({ message: 'Tournament not found' });
//     }

//     res.status(200).json({
//       knockoutStage: tournament.knockoutStage
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // Helper Functions
// function isPowerOfTwo(n) {
//   return n > 0 && (n & (n - 1)) === 0;
// }

// function generateFirstRoundMatches(players) {
//   const matches = [];
//   const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
  
//   for (let i = 0; i < shuffledPlayers.length; i += 2) {
//     matches.push({
//       matchNumber: (i / 2) + 1,
//       round: 1,
//       player1: shuffledPlayers[i],
//       player2: shuffledPlayers[i + 1],
//       status: 'scheduled'
//     });
//   }
  
//   return matches;
// }

// function generateNextRoundMatches(completedMatches, nextRound) {
//   const matches = [];
  
//   for (let i = 0; i < completedMatches.length; i += 2) {
//     matches.push({
//       matchNumber: (i / 2) + 1,
//       round: nextRound,
//       player1: completedMatches[i].winner,
//       player2: completedMatches[i + 1].winner,
//       status: 'scheduled'
//     });
//   }
  
//   return matches;
// }

// controllers/knockoutController.js
import Tournament from '../tournament/tournament.model.js';
import TournamentPlayer from '../others/tournamentPlayer.model.js';
import KnockoutStage from '../others/knockoutSchema.model.js';
import KnockoutMatch from '../match/match.model.js';

// Initialize Knockout Stage
export const initializeKnockout = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const tournament = await Tournament.findById(tournamentId);

    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    // Check if knockout stage already exists
    const existingStage = await KnockoutStage.findOne({ tournamentId });
    if (existingStage) {
      return res.status(400).json({ message: "Knockout stage already initialized" });
    }

    // Auto-fetch all active registered players
    const registeredPlayers = await TournamentPlayer.find({
      tournamentId,
      isActive: true,
      assignMatch: true
    }).select("playerId");

    if (registeredPlayers.length === 0) {
      return res.status(400).json({ message: "No registered players found" });
    }

    // Extract only IDs
    const qualifiedPlayers = registeredPlayers.map(p => p.playerId.toString());

    // Validate number of players (must be power of 2)
    const playerCount = qualifiedPlayers.length;
    if (!isPowerOfTwo(playerCount)) {
      return res.status(400).json({ 
        message: 'Number of qualified players must be a power of 2 (8, 16, 32, etc.)' 
      });
    }

    // Calculate total rounds
    const totalRounds = Math.log2(playerCount);
    
    // Create Knockout Stage
    const knockoutStage = await KnockoutStage.create({
      tournamentId,
      isActive: true,
      currentRound: 1,
      totalRounds,
      createdBy: req.user?._id
    });

    // Generate first round matches
    const matchesData = generateFirstRoundMatches(qualifiedPlayers, tournamentId, knockoutStage._id, req.user?._id);
    const matches = await KnockoutMatch.insertMany(matchesData);

    // Store match IDs in knockout stage
    knockoutStage.matchIds = matches.map(m => m._id);
    await knockoutStage.save();

    // Optionally update tournament status
    // tournament.status = 'Knockout';
    // await tournament.save();

    res.status(200).json({
      message: 'Knockout stage initialized successfully',
      knockoutStage,
      matches
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Auto-generate next round matches
export const generateNextRound = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    
    const knockoutStage = await KnockoutStage.findOne({ tournamentId });

    if (!knockoutStage || !knockoutStage.isActive) {
      return res.status(400).json({ message: 'Knockout stage not active' });
    }

    const { currentRound, totalRounds } = knockoutStage;

    // Get current round matches
    const currentRoundMatches = await KnockoutMatch.find({
      knockoutStageId: knockoutStage._id,
      round: currentRound
    }).populate('player1 player2 pair1 pair2 winner');

    // Check if current round is complete
    const allMatchesComplete = currentRoundMatches.every(m => m.status === 'completed' && m.winner);

    if (!allMatchesComplete) {
      return res.status(400).json({ 
        message: 'Current round not complete. All matches must have winners.' 
      });
    }

    // Check if tournament is complete
    if (currentRound >= totalRounds) {
      knockoutStage.isActive = false;
      await knockoutStage.save();

      const tournament = await Tournament.findById(tournamentId);
      tournament.status = 'completed';
      await tournament.save();

      return res.status(200).json({ 
        message: 'Tournament completed!',
        winner: currentRoundMatches[0].winner 
      });
    }

    // Generate next round matches
    const nextRoundMatchesData = generateNextRoundMatches(
      currentRoundMatches, 
      currentRound + 1, 
      tournamentId, 
      knockoutStage._id,
      req.user?._id
    );
    
    const nextRoundMatches = await KnockoutMatch.insertMany(nextRoundMatchesData);

    // Update knockout stage
    knockoutStage.currentRound += 1;
    knockoutStage.matchIds.push(...nextRoundMatches.map(m => m._id));
    await knockoutStage.save();

    res.status(200).json({
      message: `Round ${currentRound + 1} generated successfully`,
      nextRoundMatches
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update match result and auto-advance winner
export const updateMatchResult = async (req, res) => {
  try {
    const { tournamentId, matchId } = req.params;
    const { winnerId, player1Score, player2Score, pair1Score, pair2Score } = req.body;

    const match = await KnockoutMatch.findById(matchId);
    
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const knockoutStage = await KnockoutStage.findOne({ tournamentId });
    
    if (!knockoutStage) {
      return res.status(404).json({ message: 'Knockout stage not found' });
    }

    // Update match details
    match.winner = winnerId;
    match.player1Score = player1Score || 0;
    match.player2Score = player2Score || 0;
    match.pair1Score = pair1Score || 0;
    match.pair2Score = pair2Score || 0;
    match.status = 'completed';
    match.updatedBy = req.user?._id;

    await match.save();

    // Check if round is complete and auto-generate next round
    const currentRound = knockoutStage.currentRound;
    const currentRoundMatches = await KnockoutMatch.find({
      knockoutStageId: knockoutStage._id,
      round: currentRound
    });

    const allComplete = currentRoundMatches.every(m => m.status === 'completed');

    let autoAdvanced = false;
    if (allComplete && currentRound < knockoutStage.totalRounds) {
      // Auto-generate next round
      const nextRoundMatchesData = generateNextRoundMatches(
        currentRoundMatches, 
        currentRound + 1,
        tournamentId,
        knockoutStage._id,
        req.user?._id
      );
      const nextRoundMatches = await KnockoutMatch.insertMany(nextRoundMatchesData);
      
      knockoutStage.currentRound += 1;
      knockoutStage.matchIds.push(...nextRoundMatches.map(m => m._id));
      await knockoutStage.save();
      autoAdvanced = true;
    }

    res.status(200).json({
      message: 'Match result updated successfully',
      match,
      autoAdvanced
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Hold/Resume Tournament
export const toggleTournamentHold = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { holdReason } = req.body;

    const knockoutStage = await KnockoutStage.findOne({ tournamentId });
    
    if (!knockoutStage) {
      return res.status(404).json({ message: 'Knockout stage not found' });
    }

    knockoutStage.onHold = !knockoutStage.onHold;
    knockoutStage.holdReason = knockoutStage.onHold ? holdReason : null;

    await knockoutStage.save();

    res.status(200).json({
      message: knockoutStage.onHold ? 'Tournament on hold' : 'Tournament resumed',
      knockoutStage
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reschedule Match
export const rescheduleMatch = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { date, time, venue, notes } = req.body;

    const match = await KnockoutMatch.findById(matchId);
    
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    // Update schedule
    match.date = date || match.date;
    match.time = time || match.time;
    match.venue = venue || match.venue;
    match.notes = notes || match.notes;
    match.status = 'rescheduled';
    match.updatedBy = req.user?._id;

    await match.save();

    res.status(200).json({
      message: 'Match rescheduled successfully',
      match
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Knockout Stage Details
export const getKnockoutStage = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    
    const knockoutStage = await KnockoutStage.findOne({ tournamentId });

    if (!knockoutStage) {
      return res.status(404).json({ message: 'Knockout stage not found' });
    }

    // Get all matches for this knockout stage
    const matches = await KnockoutMatch.find({ 
      knockoutStageId: knockoutStage._id 
    })
    .populate('player1 player2 pair1 pair2 winner')
    .sort({ round: 1, matchNumber: 1 });

    res.status(200).json({
      knockoutStage,
      matches
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get matches by round
export const getMatchesByRound = async (req, res) => {
  try {
    const { tournamentId, round } = req.params;
    
    const knockoutStage = await KnockoutStage.findOne({ tournamentId });

    if (!knockoutStage) {
      return res.status(404).json({ message: 'Knockout stage not found' });
    }

    const matches = await KnockoutMatch.find({
      knockoutStageId: knockoutStage._id,
      round: parseInt(round)
    })
    .populate('player1 player2 pair1 pair2 winner')
    .sort({ matchNumber: 1 });

    res.status(200).json({ matches });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single match details
export const getMatchDetails = async (req, res) => {
  try {
    const { matchId } = req.params;
    
    const match = await KnockoutMatch.findById(matchId)
      .populate('player1 player2 pair1 pair2 winner')
      .populate('createdBy updatedBy', 'name email');

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    res.status(200).json({ match });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper Functions
function isPowerOfTwo(n) {
  return n > 0 && (n & (n - 1)) === 0;
}

function generateFirstRoundMatches(players, tournamentId, knockoutStageId, userId) {
  const matches = [];
  const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < shuffledPlayers.length; i += 2) {
    matches.push({
      tournamentId,
      knockoutStageId,
      matchNumber: (i / 2) + 1,
      round: 1,
      player1: shuffledPlayers[i],
      player2: shuffledPlayers[i + 1],
      status: 'scheduled',
      createdBy: userId
    });
  }
  
  return matches;
}

function generateNextRoundMatches(completedMatches, nextRound, tournamentId, knockoutStageId, userId) {
  const matches = [];
  
  for (let i = 0; i < completedMatches.length; i += 2) {
    matches.push({
      tournamentId,
      knockoutStageId,
      matchNumber: (i / 2) + 1,
      round: nextRound,
      player1: completedMatches[i].winner,
      player2: completedMatches[i + 1]?.winner,
      status: 'scheduled',
      createdBy: userId
    });
  }
  
  return matches;
}