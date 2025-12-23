import Tournament from '../tournament/tournament.model.js';
import TournamentPlayer from '../others/tournamentPlayer.model.js';
import KnockoutStage from '../others/knockoutSchema.model.js';
import KnockoutMatch from '../match/match.model.js';
import Round from '../round/round.model.js';

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
      assignMatch: false
    }).select("playerId pairId");

    if (registeredPlayers.length === 0) {
      return res.status(400).json({ message: "No registered players found" });
    }

    // Extract player or pair IDs based on tournament format
    const qualifiedEntries = registeredPlayers.map(p => {
      if (tournament.format === 'Pair') {
        return { pairId: p.pairId };
      } else {
        return { playerId: p.playerId };
      }
    });

    // Validate number of entries (must be power of 2)
    const entryCount = qualifiedEntries.length;
    if (!isPowerOfTwo(entryCount)) {
      return res.status(400).json({ 
        message: 'Number of qualified entries must be a power of 2 (8, 16, 32, etc.)' 
      });
    }

    // Calculate total rounds
    const totalRounds = Math.log2(entryCount);

    let rounds = [];
    let date = null;
    let currentRound = 0;

    rounds = await Round.find({ tournamentId: tournamentId });
    if (rounds.length > 0) {

      const currentRoundInfo = rounds.find(r => r.roundNumber === currentRound + 1);

      if (currentRoundInfo) {

        date = currentRoundInfo.date;

      }
    }
    
    // Create Knockout Stage
    const knockoutStage = await KnockoutStage.create({
      tournamentId,
      isActive: true,
      currentRound: 1,
      totalRounds,
      createdBy: req.user?._id,
      date
    });

    // FIXED: Add await here
    const matchesData = await generateFirstRoundMatches(
      qualifiedEntries, 
      tournamentId, 
      knockoutStage._id, 
      req.user?._id,
      tournament.format
    );
    
    const matches = await KnockoutMatch.insertMany(matchesData);

    // Store match IDs in knockout stage
    knockoutStage.matchIds = matches.map(m => m._id);
    await knockoutStage.save();

    res.status(200).json({
      message: 'Knockout stage initialized successfully',
      knockoutStage,
      matches
    });
  } catch (error) {
    console.error('Initialize Knockout Error:', error);
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
    let rounds = [];
    let date = null;

    rounds = await Round.find({ tournamentId: tournamentId }).sort({ roundNumber: 1 });
    if (rounds.length > 0) {

      const currentRoundInfo = rounds.find(r => r.roundNumber === currentRound + 1);

      if (currentRoundInfo) {

        date = currentRoundInfo.date;

      }
    }
    // FIXED: Add await here
    const nextRoundMatchesData = await generateNextRoundMatches(
      currentRoundMatches, 
      currentRound + 1, 
      tournamentId, 
      knockoutStage._id,
      req.user?._id,
      date
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
    console.error('Generate Next Round Error:', error);
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
      // FIXED: Add await here
      const nextRoundMatchesData = await generateNextRoundMatches(
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
    console.error('Update Match Result Error:', error);
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

// FIXED: Properly handle both Single and Pair formats
async function generateFirstRoundMatches(entries, tournamentId, knockoutStageId, userId, format) {
  const matches = [];
  const shuffledEntries = [...entries].sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < shuffledEntries.length; i += 2) {
    const matchData = {
      tournamentId,
      knockoutStageId,
      matchNumber: (i / 2) + 1,
      round: 1,
      status: 'scheduled',
      createdBy: userId,
      matchType: format
    };

    // Set player or pair based on format
    if (format === 'Pair') {
      matchData.pair1 = shuffledEntries[i].pairId;
      matchData.pair2 = shuffledEntries[i + 1].pairId;
    } else {
      matchData.player1 = shuffledEntries[i].playerId;
      matchData.player2 = shuffledEntries[i + 1].playerId;
    }

    matches.push(matchData);
  }
  
  return matches;
}

// FIXED: Properly handle winners based on format
async function generateNextRoundMatches(completedMatches, nextRound, tournamentId, knockoutStageId, userId) {
  const matches = [];
  const tournament = await Tournament.findById(tournamentId);
  
  if (!tournament) {
    throw new Error('Tournament not found');
  }

  for (let i = 0; i < completedMatches.length; i += 2) {
    const match1 = completedMatches[i];
    const match2 = completedMatches[i + 1];

    if (!match1 || !match1.winner) {
      throw new Error(`Match ${i} does not have a winner`);
    }

    const matchData = {
      tournamentId,
      knockoutStageId,
      matchNumber: (i / 2) + 1,
      round: nextRound,
      status: 'scheduled',
      createdBy: userId,
      matchType: tournament.format
    };

    // Set winners based on format
    if (tournament.format === 'Pair') {
      matchData.pair1 = match1.winner;
      matchData.pair2 = match2?.winner || null;
    } else {
      matchData.player1 = match1.winner;
      matchData.player2 = match2?.winner || null;
    }

    matches.push(matchData);
  }
  
  return matches;
}