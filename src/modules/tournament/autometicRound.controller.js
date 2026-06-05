import Tournament from "../tournament/tournament.model.js";
import TournamentPlayer from "../others/tournamentPlayer.model.js";
import KnockoutStage from "../others/knockoutSchema.model.js";
import Match from "../match/match.model.js";
import Round from "../round/round.model.js";
import AppError from "../../middleware/errorHandler.js";

// ─────────────────────────────────────────────────────────────────────────────
// INITIALIZE KNOCKOUT  (called once – creates Round 1 matches)
// ─────────────────────────────────────────────────────────────────────────────
export const initializeKnockout = async (tournamentId, userId) => {
  try {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) throw new AppError(404, false, "Tournament not found");

    const existingStage = await KnockoutStage.findOne({ tournamentId });
    if (existingStage)
      throw new AppError(500, false, "Knockout stage already initialized");

    const registeredPlayers = await TournamentPlayer.find({
      tournamentId,
      isActive: true,
      assignMatch: false,
    })
      .select("playerId pairId seeder handicap createdAt")
      .populate("playerId", "seeder handicap seedStats")
      .populate({
        path: "pairId",
        select: "seeder player1 player2",
        populate: [
          { path: "player1", select: "seeder handicap seedStats" },
          { path: "player2", select: "seeder handicap seedStats" },
        ],
      });

    if (registeredPlayers.length === 0)
      throw new AppError(500, false, "No registered players found");

    // Sort so index 0 = seed 1. Manual seed is optional; missing seed falls
    // back to cached win-rate stats updated when match results are saved.
    const sorted = sortEntriesBySeed(registeredPlayers, tournament);
    await persistMissingSeedValues(sorted, tournament.format);

    const qualifiedEntries = sorted.map((p) =>
      tournament.format === "Pairs"
        ? { pairId: p.pairId, seeder: p.seeder }
        : { playerId: p.playerId, seeder: p.seeder }
    );

    const entryCount = qualifiedEntries.length;
    if (!isPowerOfTwo(entryCount))
      throw new AppError(
        500,
        false,
        "Number of qualified entries must be a power of 2 (8, 16, 32, etc.)"
      );

    const totalRounds = Math.log2(entryCount);

    let date = null;
    const rounds = await Round.find({ tournamentId });
    if (rounds.length > 0) {
      const r1 = rounds.find((r) => r.roundNumber === 1);
      if (r1) date = r1.date;
    }

    const knockoutStage = await KnockoutStage.create({
      tournamentId,
      isActive: true,
      currentRound: 1,
      totalRounds,
      createdBy: userId,
      date,
      status: "in progress",
    });

    const matchesData = await generateFirstRoundMatches(
      qualifiedEntries,
      tournamentId,
      knockoutStage._id,
      userId,
      tournament.format
    );

    const matches = await Match.insertMany(matchesData);
    knockoutStage.matchIds = matches.map((m) => m._id);
    await knockoutStage.save();

    return {
      message: "Knockout stage initialized successfully",
      knockoutStage,
      matches,
    };
  } catch (error) {
    console.log("Initialize Knockout Error:", error);
    throw new AppError(500, false, error.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CHECK AND AUTO-ADVANCE ROUND
//
// ✅ Export this and call it from updateTournamentMatch (match service)
//    right after match.save().
//
// It is completely self-contained — no req/res — so it works from any
// service method without needing a controller or HTTP context.
//
// Returns a plain object the caller can attach to its HTTP response.
// If auto-advance fails it logs the error but does NOT throw, so the
// already-saved match result is never rolled back.
// ─────────────────────────────────────────────────────────────────────────────
export const checkAndAutoAdvanceRound = async (tournamentId, userId) => {
  try {
    const knockoutStage = await KnockoutStage.findOne({ tournamentId });

    if (!knockoutStage || !knockoutStage.isActive) {
      return { advanced: false, reason: "no_active_stage" };
    }

    const currentRound = knockoutStage.currentRound;

    // Always re-fetch from DB to get the latest status of every match
    const currentRoundMatches = await Match.find({
      knockoutStageId: knockoutStage._id,
      round: currentRound,
    }).sort({ matchNumber: 1 });

    const allComplete = currentRoundMatches.every(
      (m) => m.status === "completed" && m.winner
    );

    if (!allComplete) {
      return { advanced: false, reason: "round_incomplete" };
    }

    // ── All matches in this round are done ────────────────────────────────────

    // Final round → close the tournament
    if (currentRound >= knockoutStage.totalRounds) {
      const result = await completeTournament(knockoutStage, currentRoundMatches);
      return {
        advanced: false,
        tournamentComplete: true,
        champion: result.winner,
        message: "Tournament completed! Champion determined.",
      };
    }

    // Not the final round → generate the next round
    const nextRoundResult = await createNextRound(
      knockoutStage,
      currentRoundMatches,
      tournamentId,
      userId
    );

    return {
      advanced: true,
      tournamentComplete: false,
      roundComplete: true,
      nextRound: nextRoundResult,
      message: `Round ${currentRound} complete — Round ${
        currentRound + 1
      } generated automatically.`,
    };
  } catch (error) {
    // Safe fallback — match save already succeeded, don't undo it
    console.error("❌ checkAndAutoAdvanceRound error:", error.message);
    return { advanced: false, reason: "error", error: error.message };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS TOURNAMENT  (single "Start Tournament" button — creates Round 1)
// ─────────────────────────────────────────────────────────────────────────────
export const progressTournament = async (req, res, next) => {
  try {
    const { tournamentId } = req.params;
    const userId = req.user._id;
    const role = req.user.role;

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament)
      return res.status(404).json({ message: "Tournament not found" });

    if (role === "Admin") {
      tournament.tournamentStatus = "approved";
      await tournament.save();
    }

    if (tournament.tournamentStatus !== "approved") {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to start a tournament unless it is approved.",
      });
    }

    if (tournament.onHold) {
      return res.status(400).json({
        success: false,
        message: "This tournament is currently on hold — cannot initialize knockout.",
      });
    }

    const knockoutStage = await KnockoutStage.findOne({ tournamentId });

    if (!knockoutStage) {
      const initResult = await initializeKnockout(tournamentId, userId);
      return res.status(200).json({
        message:
          "Tournament initialized. Round 1 created. Subsequent rounds generate automatically when each round is completed.",
        data: initResult,
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Tournament is already in progress. Rounds advance automatically when all matches in the current round are completed.",
      currentRound: knockoutStage.currentRound,
      totalRounds: knockoutStage.totalRounds,
    });
  } catch (error) {
    return next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GENERATE NEXT ROUND  (kept for manual / admin fallback)
// ─────────────────────────────────────────────────────────────────────────────
export const generateNextRound = async (tournamentId, userId) => {
  try {
    const knockoutStage = await KnockoutStage.findOne({ tournamentId });
    if (!knockoutStage || !knockoutStage.isActive)
      throw new AppError(404, false, "Knockout stage not found or inactive");

    const { currentRound, totalRounds } = knockoutStage;

    const currentRoundMatches = await Match.find({
      knockoutStageId: knockoutStage._id,
      round: currentRound,
    })
      .populate("player1Id player2Id pair1Id pair2Id winner")
      .sort({ matchNumber: 1 });

    // Auto-assign winners where scores exist but winner field is empty
    for (let match of currentRoundMatches) {
      if (match.status === "completed" && !match.winner) {
        let winnerId = null;
        if (match.matchType === "Pairs") {
          winnerId =
            match.pair1Score > match.pair2Score
              ? match.pair1Id?._id
              : match.pair2Score > match.pair1Score
              ? match.pair2Id?._id
              : null;
          match.winnerModel = "TournamentPair";
        } else {
          winnerId =
            match.player1Score > match.player2Score
              ? match.player1Id?._id
              : match.player2Score > match.player1Score
              ? match.player2Id?._id
              : null;
          match.winnerModel = "User";
        }
        if (winnerId) {
          match.winner = winnerId;
          await match.save();
        }
      }
    }

    const allMatchesComplete = currentRoundMatches.every(
      (m) => m.status === "completed" && m.winner
    );
    if (!allMatchesComplete)
      throw new AppError(
        500,
        false,
        "Current round not complete. All matches must have winners."
      );

    if (currentRound >= totalRounds) {
      return await completeTournament(knockoutStage, currentRoundMatches);
    }

    return await createNextRound(
      knockoutStage,
      currentRoundMatches,
      tournamentId,
      userId
    );
  } catch (error) {
    console.log("Generate Next Round Error:", error);
    throw new AppError(500, false, error.message || "Failed to generate next round");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// TOGGLE HOLD
// ─────────────────────────────────────────────────────────────────────────────
export const toggleTournamentHold = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { onHold, holdReason } = req.body;

    if (typeof onHold !== "boolean")
      return res.status(400).json({ success: false, message: "`onHold` must be a boolean" });

    const knockoutStage = await KnockoutStage.findOne({ tournamentId });
    if (!knockoutStage)
      return res.status(404).json({ success: false, message: "Knockout stage not found" });

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament)
      return res.status(404).json({ success: false, message: "Tournament not found" });

    knockoutStage.onHold = onHold;
    knockoutStage.holdReason = onHold ? holdReason : null;
    tournament.onHold = onHold;
    await knockoutStage.save();
    await tournament.save();

    return res.status(200).json({
      success: true,
      message: onHold ? "Tournament successfully put on hold" : "Tournament successfully resumed",
      onHold,
      holdReason: knockoutStage.holdReason,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: error.message || "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// RESCHEDULE MATCH
// ─────────────────────────────────────────────────────────────────────────────
export const rescheduleMatch = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { date, time, venue, notes } = req.body;

    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ message: "Match not found" });

    match.date = date || match.date;
    match.time = time || match.time;
    match.venue = venue || match.venue;
    match.notes = notes || match.notes;
    match.status = "rescheduled";
    match.updatedBy = req.user?._id;
    await match.save();

    res.status(200).json({ message: "Match rescheduled successfully", match });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// READ ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────
export const getKnockoutStage = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const knockoutStage = await KnockoutStage.findOne({ tournamentId });
    if (!knockoutStage)
      return res.status(404).json({ message: "Knockout stage not found" });

    const matches = await Match.find({ knockoutStageId: knockoutStage._id })
      .populate("player1Id player2Id pair1Id pair2Id winner")
      .sort({ round: 1, matchNumber: 1 });

    res.status(200).json({ knockoutStage, matches });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMatchesByRound = async (req, res) => {
  try {
    const { tournamentId, round } = req.params;
    const knockoutStage = await KnockoutStage.findOne({ tournamentId });
    if (!knockoutStage)
      return res.status(404).json({ message: "Knockout stage not found" });

    const matches = await Match.find({
      knockoutStageId: knockoutStage._id,
      round: parseInt(round),
    })
      .populate("player1Id player2Id pair1Id pair2Id winner")
      .sort({ matchNumber: 1 });

    res.status(200).json({
      success: true,
      message: `Matches for Round ${round} fetched successfully`,
      matches,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMatchDetails = async (req, res) => {
  try {
    const { matchId } = req.params;
    const match = await Match.findById(matchId)
      .populate("player1Id player2Id pair1Id pair2Id winner")
      .populate("createdBy updatedBy", "name email");

    if (!match) return res.status(404).json({ message: "Match not found" });

    res.status(200).json({ match });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PRIVATE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function isPowerOfTwo(n) {
  return n > 0 && (n & (n - 1)) === 0;
}

/**
 * Recursive seeded bracket positions.
 * n=8  → [1, 8, 4, 5, 3, 6, 2, 7]
 *         Match 1: seed1 v seed8
 *         Match 2: seed4 v seed5
 *         Match 3: seed3 v seed6
 *         Match 4: seed2 v seed7
 */
function bracketPositions(size) {
  if (size === 1) return [1];
  if (size === 2) return [1, 2];
  if (size === 4) return [1, 4, 3, 2];

  const half = size / 2;
  const top = bracketPositions(half);
  return top.flatMap((pos) => [pos, size + 1 - pos]);
}

function getManualSeedValue(entry, format) {
  if (format === "Pairs") {
    const players = [entry.pairId?.player1, entry.pairId?.player2].filter(Boolean);
    const pairSeedFromPlayers = getPairSeedValue(players);
    if (pairSeedFromPlayers) return pairSeedFromPlayers;

    const pairSeed = Number(entry.pairId?.seeder ?? entry.seeder);
    return Number.isFinite(pairSeed) && pairSeed > 0 ? pairSeed : null;
  }

  const tournamentSeed = Number(entry.seeder);
  if (Number.isFinite(tournamentSeed) && tournamentSeed > 0) return tournamentSeed;

  const explicitSeed = Number(entry.playerId?.seeder);
  return Number.isFinite(explicitSeed) && explicitSeed > 0 ? explicitSeed : null;
}

function getHandicapValue(entry, format) {
  if (format === "Pairs") {
    const players = [entry.pairId?.player1, entry.pairId?.player2].filter(Boolean);

    const handicaps = players
      .map((player) => Number(player.handicap))
      .filter(Number.isFinite);

    if (handicaps.length > 0) {
      return handicaps.reduce((total, handicap) => total + handicap, 0) / handicaps.length;
    }

    return 999;
  }

  const userHandicap = Number(entry.playerId?.handicap);
  if (Number.isFinite(userHandicap)) return userHandicap;

  const registrationHandicap = Number(entry.handicap);
  return Number.isFinite(registrationHandicap) ? registrationHandicap : 999;
}

function sortEntriesBySeed(entries, tournament) {
  const rankedEntries = entries.map((entry) => ({
    entry,
    manualSeed: getManualSeedValue(entry, tournament.format),
    history: getCachedHistoryRank(entry, tournament.format),
    handicap: getHandicapValue(entry, tournament.format),
    createdAt: new Date(entry.createdAt || 0).getTime(),
  }));

  rankedEntries.sort((a, b) => {
    const aHasManualSeed = Number.isFinite(a.manualSeed);
    const bHasManualSeed = Number.isFinite(b.manualSeed);

    if (aHasManualSeed && bHasManualSeed) return a.manualSeed - b.manualSeed;
    if (aHasManualSeed) return -1;
    if (bHasManualSeed) return 1;

    if (b.history.winRate !== a.history.winRate) {
      return b.history.winRate - a.history.winRate;
    }

    if (b.history.wins !== a.history.wins) return b.history.wins - a.history.wins;
    if (b.history.matchesPlayed !== a.history.matchesPlayed) {
      return b.history.matchesPlayed - a.history.matchesPlayed;
    }

    if (a.handicap !== b.handicap) return a.handicap - b.handicap;
    return a.createdAt - b.createdAt;
  });

  return rankedEntries.map(({ entry }) => entry);
}

async function persistMissingSeedValues(sortedEntries, format) {
  for (let i = 0; i < sortedEntries.length; i++) {
    const entry = sortedEntries[i];
    const computedSeed = i + 1;

    if (format === "Pairs" && entry.pairId) {
      const players = [entry.pairId.player1, entry.pairId.player2].filter(Boolean);
      const pairSeed = getPairSeedValue(players) ?? computedSeed;

      entry.seeder = pairSeed;
      await entry.save();

      entry.pairId.seeder = pairSeed;
      await entry.pairId.save();
      continue;
    }

    if (!Number.isFinite(Number(entry.seeder)) || Number(entry.seeder) <= 0) {
      entry.seeder = computedSeed;
      await entry.save();
    }
  }
}

function getCachedHistoryRank(entry, format) {
  if (format === "Pairs") {
    const players = [entry.pairId?.player1, entry.pairId?.player2].filter(Boolean);
    const playerRanks = players.map((player) => normalizeSeedStats(player.seedStats));

    if (playerRanks.length === 0) return emptyHistoryRank();

    return {
      matchesPlayed: playerRanks.reduce((total, rank) => total + rank.matchesPlayed, 0),
      wins: playerRanks.reduce((total, rank) => total + rank.wins, 0),
      winRate:
        playerRanks.reduce((total, rank) => total + rank.winRate, 0) / playerRanks.length,
    };
  }

  return normalizeSeedStats(entry.playerId?.seedStats);
}

function getPairSeedValue(players) {
  const seedValues = players
    .map((player) => Number(player?.seeder))
    .filter((seed) => Number.isFinite(seed) && seed > 0);

  return seedValues.length === players.length && seedValues.length > 0
    ? seedValues.reduce((total, seed) => total + seed, 0)
    : null;
}

function normalizeSeedStats(seedStats) {
  const matchesPlayed = Number(seedStats?.matchesPlayed) || 0;
  const wins = Number(seedStats?.wins) || 0;

  return {
    matchesPlayed,
    wins,
    winRate: matchesPlayed > 0
      ? Number(((wins / matchesPlayed) * 100).toFixed(2))
      : 0,
  };
}

function emptyHistoryRank() {
  return {
    matchesPlayed: 0,
    wins: 0,
    winRate: 0,
  };
}

/**
 * Shared helper: insert next-round matches and update knockoutStage.
 */
async function createNextRound(knockoutStage, completedMatches, tournamentId, userId) {
  const nextRoundNumber = knockoutStage.currentRound + 1;

  const nextRoundMatchesData = await generateNextRoundMatches(
    completedMatches,
    nextRoundNumber,
    tournamentId,
    knockoutStage._id,
    userId
  );

  const nextRoundMatches = await Match.insertMany(nextRoundMatchesData);

  knockoutStage.currentRound = nextRoundNumber;
  knockoutStage.matchIds.push(...nextRoundMatches.map((m) => m._id));
  await knockoutStage.save();

  return {
    message: `Round ${nextRoundNumber} generated successfully`,
    nextRoundMatches,
  };
}

/**
 * Mark tournament as complete, return champion.
 */
async function completeTournament(knockoutStage, finalMatches) {
  knockoutStage.isActive = false;
  knockoutStage.status = "completed";
  await knockoutStage.save();

  const tournament = await Tournament.findById(knockoutStage.tournamentId);
  if (tournament) {
    tournament.status = "completed";
    await tournament.save();
  }

  return {
    message: "Tournament completed!",
    winner: finalMatches[0]?.winner || null,
  };
}

/**
 * Round 1 match generation using standard seeded bracket order.
 * entries[0] = seed 1 (best), entries[n-1] = seed n.
 */
async function generateFirstRoundMatches(entries, tournamentId, knockoutStageId, userId, format) {
  const round = await Round.findOne({ tournamentId, roundNumber: 1 });
  const matchDate = round?.date || null;

  const positions = bracketPositions(entries.length);          // e.g. [1,8,4,5,3,6,2,7]
  const orderedEntries = positions.map((seed) => entries[seed - 1]); // map seed→entry

  const matchesData = [];

  for (let i = 0; i < orderedEntries.length; i += 2) {
    const entryA = orderedEntries[i];
    const entryB = orderedEntries[i + 1];

    const matchData = {
      tournamentId,
      knockoutStageId,
      matchNumber: i / 2 + 1,
      round: 1,
      status: "scheduled",
      createdBy: userId,
      matchType: format,
      date: matchDate,
    };

    if (format === "Pairs") {
      matchData.pair1Id = entryA.pairId;
      matchData.pair2Id = entryB.pairId;
      for (const entry of [entryA, entryB]) {
        const tp = await TournamentPlayer.findOne({
          tournamentId,
          pairId: entry.pairId,
          isActive: true,
        });
        if (tp) { tp.assignMatch = true; await tp.save(); }
      }
    } else {
      matchData.player1Id = entryA.playerId;
      matchData.player2Id = entryB.playerId;
      for (const entry of [entryA, entryB]) {
        const tp = await TournamentPlayer.findOne({
          tournamentId,
          playerId: entry.playerId,
        });
        if (tp) { tp.assignMatch = true; await tp.save(); }
      }
    }

    matchesData.push(matchData);
  }

  return matchesData;
}

/**
 * Rounds 2+: pair up winners from previous round by matchNumber order.
 * Winner of M1 vs Winner of M2, Winner of M3 vs Winner of M4, …
 */
async function generateNextRoundMatches(
  completedMatches,
  nextRound,
  tournamentId,
  knockoutStageId,
  userId
) {
  const matches = [];
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) throw new AppError(404, false, "Tournament not found");

  const roundDoc = await Round.findOne({ tournamentId, roundNumber: nextRound });
  const matchDate = roundDoc?.date || null;

  for (let i = 0; i < completedMatches.length; i += 2) {
    const match1 = completedMatches[i];
    const match2 = completedMatches[i + 1];

    if (!match1?.winner)
      throw new AppError(500, false, `Match ${i + 1} does not have a winner`);

    const matchData = {
      tournamentId,
      knockoutStageId,
      matchNumber: i / 2 + 1,
      round: nextRound,
      status: "scheduled",
      createdBy: userId,
      matchType: tournament.format,
      date: matchDate,
    };

    if (tournament.format === "Pairs") {
      matchData.pair1Id = match1.winner;
      matchData.pair2Id = match2?.winner || null;
    } else {
      matchData.player1Id = match1.winner;
      matchData.player2Id = match2?.winner || null;
    }

    matches.push(matchData);
  }

  return matches;
}



// import Tournament from "../tournament/tournament.model.js";
// import TournamentPlayer from "../others/tournamentPlayer.model.js";
// import KnockoutStage from "../others/knockoutSchema.model.js";
// import Match from "../match/match.model.js";
// import Round from "../round/round.model.js";
// import AppError from "../../middleware/errorHandler.js";

// export const initializeKnockout = async (tournamentId, userId) => {
//   try {
   
//     const tournament = await Tournament.findById(tournamentId);

//     if (!tournament) {
    
//       throw new AppError(404, false,"Tournament not found");
//     }

//     const existingStage = await KnockoutStage.findOne({ tournamentId });
//     if (existingStage) {
//       throw new AppError(500, false, "Knockout stage already initialized");
//     }

//     const registeredPlayers = await TournamentPlayer.find({
//       tournamentId,
//       isActive: true,
//       assignMatch: false,
//     }).select("playerId pairId");

//     if (registeredPlayers.length === 0) {
//       throw new AppError(500, false, "No registered players found");
//     }

//     const qualifiedEntries = registeredPlayers.map((p) => {
//       if (tournament.format === "Pairs") {
//         return { pairId: p.pairId };
//       } else {
//         return { playerId: p.playerId };
//       }
//     });

//     const entryCount = qualifiedEntries.length;
//     if (!isPowerOfTwo(entryCount)) {
//       throw new AppError(500, false,
//         "Number of qualified entries must be a power of 2 (8, 16, 32, etc.)"
//       );
//     }

//     const totalRounds = Math.log2(entryCount);

//     let rounds = [];
//     let date = null;
//     let currentRound = 0;

//     rounds = await Round.find({ tournamentId: tournamentId });
//     if (rounds.length > 0) {
//       const currentRoundInfo = rounds.find(
//         (r) => r.roundNumber === currentRound + 1
//       );

//       if (currentRoundInfo) {
//         date = currentRoundInfo.date;
//       }
//     }

//     const knockoutStage = await KnockoutStage.create({
//       tournamentId,
//       isActive: true,
//       currentRound: 1,
//       totalRounds,
//       createdBy: userId,
//       date,
//       status: "in progress",
//     });

//     const matchesData = await generateFirstRoundMatches(
//       qualifiedEntries,
//       tournamentId,
//       knockoutStage._id,
//       userId,
//       tournament.format
//     );

//     const matches = await Match.insertMany(matchesData);

//     knockoutStage.matchIds = matches.map((m) => m._id);
//     await knockoutStage.save();

//     return {
//       message: "Knockout stage initialized successfully",
//       knockoutStage,
//       matches,
//     };
//   } catch (error) {
//     console.log("Initialize Knockout AppError:", error);
//     throw new AppError(500, false, error.message);
//   }
// };

// export const generateNextRound = async (tournamentId, userId) => {
//   try {
//     const knockoutStage = await KnockoutStage.findOne({ tournamentId });

//     if (!knockoutStage || !knockoutStage.isActive) {
//       throw new AppError(404, false, "Knockout stage not found or inactive");
//     }

//     const { currentRound, totalRounds } = knockoutStage;

//     const currentRoundMatches = await Match.find({
//       knockoutStageId: knockoutStage._id,
//       round: currentRound,
//     }).populate("player1Id player2Id pair1Id pair2Id winner");

//     for (let match of currentRoundMatches) {
//       if (match.status === "completed" && !match.winner) {
//         let winnerId = null;

//         if (match.matchType === "Pairs") {
//           if (match.pair1Score > match.pair2Score) {
//             winnerId = match.pair1Id?._id;
//           } else if (match.pair2Score > match.pair1Score) {
//             winnerId = match.pair2Id?._id;
//           }
//           match.winnerModel = "TournamentPair";
//         } else if (match.matchType === "Single") {
//           if (match.player1Score > match.player2Score) {
//             winnerId = match.player1Id?._id;
//           } else if (match.player2Score > match.player1Score) {
//             winnerId = match.player2Id?._id;
//           }
//           match.winnerModel = "User";
//         }

//         if (winnerId) {
//           match.winner = winnerId;
//           await match.save();
//         }
//       }
//     }
//     // console.log(currentRoundMatches);
//     // Check if current round is complete
//     const allMatchesComplete = currentRoundMatches.every(
//       (m) => m.status === "completed" && m.winner
//     );

//     // console.log("All Matches Complete:", allMatchesComplete);

//     if (!allMatchesComplete) {
//       throw new AppError(500, false, "Current round not complete. All matches must have winners.");
//     }

//     // Check if tournament is complete
//     if (currentRound >= totalRounds) {
//       knockoutStage.isActive = false;
//       await knockoutStage.save();

//       const tournament = await Tournament.findById(tournamentId);
//       tournament.status = "completed";
//       await tournament.save();

//       return {
//         message: "Tournament completed!",
//         winner: currentRoundMatches[0].winner,
//       };
//     }

//     let rounds = [];
//     let date = null;

//     rounds = await Round.find({ tournamentId: tournamentId }).sort({
//       roundNumber: 1,
//     });
//     if (rounds.length > 0) {
//       const currentRoundInfo = rounds.find(
//         (r) => r.roundNumber === currentRound + 1
//       );
//       if (currentRoundInfo) {
//         date = currentRoundInfo.date;
//       }
//     }

//     const nextRoundMatchesData = await generateNextRoundMatches(
//       currentRoundMatches,
//       currentRound + 1,
//       tournamentId,
//       knockoutStage._id,
//       userId,
//       date
//     );

//     const nextRoundMatches = await Match.insertMany(nextRoundMatchesData);

//     // Update knockout stage
//     knockoutStage.currentRound += 1;
//     knockoutStage.matchIds.push(...nextRoundMatches.map((m) => m._id));
//     await knockoutStage.save();

//     return {
//       message: `Round ${currentRound + 1} generated successfully`,
//       nextRoundMatches,
//     };
//   } catch (error) {
//     console.log("Generate Next Round AppError:", error);
//     throw new AppError(500, false, error.message || "Failed to generate next round");
//   }
// };
// // Update match result and auto-advance winner
// export const updateMatchResult = async (req, res) => {
//   try {
//     const { tournamentId, matchId } = req.params;
//     const { winnerId, player1Score, player2Score, pair1Score, pair2Score } =
//       req.body;

//     const match = await Match.findById(matchId);

//     if (!match) {
//       return res.status(404).json({ message: "Match not found" });
//     }

//     const knockoutStage = await KnockoutStage.findOne({ tournamentId });

//     if (!knockoutStage) {
//       return res.status(404).json({ message: "Knockout stage not found" });
//     }

//     // Update match details
//     match.winner = winnerId;
//     match.player1Score = player1Score || 0;
//     match.player2Score = player2Score || 0;
//     match.pair1Score = pair1Score || 0;
//     match.pair2Score = pair2Score || 0;
//     match.status = "completed";
//     match.updatedBy = req.user?._id;

//     await match.save();

//     // Check if round is complete and auto-generate next round
//     const currentRound = knockoutStage.currentRound;
//     const currentRoundMatches = await Match.find({
//       knockoutStageId: knockoutStage._id,
//       round: currentRound,
//     });

//     const allComplete = currentRoundMatches.every(
//       (m) => m.status === "completed"
//     );

//     let autoAdvanced = false;
//     if (allComplete && currentRound < knockoutStage.totalRounds) {
//       // FIXED: Add await here
//       const nextRoundMatchesData = await generateNextRoundMatches(
//         currentRoundMatches,
//         currentRound + 1,
//         tournamentId,
//         knockoutStage._id,
//         req.user?._id
//       );
//       const nextRoundMatches = await Match.insertMany(nextRoundMatchesData);

//       knockoutStage.currentRound += 1;
//       knockoutStage.matchIds.push(...nextRoundMatches.map((m) => m._id));
//       await knockoutStage.save();
//       autoAdvanced = true;
//     }

//     res.status(200).json({
//       message: "Match result updated successfully",
//       match,
//       autoAdvanced,
//     });
//   } catch (error) {
//     console.log("Update Match Result AppError:", error);
//     res.status(500).json({ message: error.message });
//   }
// };

// export const toggleTournamentHold = async (req, res) => {
//   try {
//     const { tournamentId } = req.params;
//     const { onHold, holdReason } = req.body;

//     // Validate boolean
//     if (typeof onHold !== 'boolean') {
//       return res.status(400).json({
//         success: false,
//         message: "`onHold` must be a boolean value"
//       });
//     }

//     const knockoutStage = await KnockoutStage.findOne({ tournamentId });
//     if (!knockoutStage) {
//       return res.status(404).json({
//         success: false,
//         message: "Knockout stage not found"
//       });
//     }

//     const tournament = await Tournament.findById(tournamentId);
//     if (!tournament) {
//       return res.status(404).json({
//         success: false,
//         message: "Tournament not found"
//       });
//     }

//     // Update BOTH documents (keep in sync)
//     knockoutStage.onHold = onHold;
//     knockoutStage.holdReason = onHold ? holdReason : null;

//     tournament.onHold = onHold;

//     await knockoutStage.save();
//     await tournament.save();

//     return res.status(200).json({
//       success: true,
//       message: onHold
//         ? "Tournament successfully put on hold"
//         : "Tournament successfully resumed",
//       onHold,
//       holdReason: knockoutStage.holdReason
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message || "Internal server error"
//     });
//   }
// };


// // Reschedule Match
// export const rescheduleMatch = async (req, res) => {
//   try {
//     const { matchId } = req.params;
//     const { date, time, venue, notes } = req.body;

//     const match = await Match.findById(matchId);

//     if (!match) {
//       return res.status(404).json({ message: "Match not found" });
//     }

//     // Update schedule
//     match.date = date || match.date;
//     match.time = time || match.time;
//     match.venue = venue || match.venue;
//     match.notes = notes || match.notes;
//     match.status = "rescheduled";
//     match.updatedBy = req.user?._id;

//     await match.save();

//     res.status(200).json({
//       message: "Match rescheduled successfully",
//       match,
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // Get Knockout Stage Details
// export const getKnockoutStage = async (req, res) => {
//   try {
//     const { tournamentId } = req.params;

//     const knockoutStage = await KnockoutStage.findOne({ tournamentId });

//     if (!knockoutStage) {
//       return res.status(404).json({ message: "Knockout stage not found" });
//     }

//     // Get all matches for this knockout stage
//     const matches = await Match.find({
//       knockoutStageId: knockoutStage._id,
//     })
//       .populate("player1 player2 pair1 pair2 winner")
//       .sort({ round: 1, matchNumber: 1 });

//     res.status(200).json({
//       knockoutStage,
//       matches,
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // Get matches by round
// export const getMatchesByRound = async (req, res) => {
//   try {
//     const { tournamentId, round } = req.params;

//     const knockoutStage = await KnockoutStage.findOne({ tournamentId });

//     if (!knockoutStage) {
//       return res.status(404).json({ message: "Knockout stage not found" });
//     }

//     const matches = await Match.find({
//       knockoutStageId: knockoutStage._id,
//       round: parseInt(round),
//     })
//       .populate("player1Id player2Id pair1Id pair2Id winner")
//       .sort({ matchNumber: 1 });

//     res.status(200).json({
//       success: true,
//       message: `Matches for Round ${round} fetched successfully`,
//       matches,
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // Get single match details
// export const getMatchDetails = async (req, res) => {
//   try {
//     const { matchId } = req.params;

//     const match = await Match.findById(matchId)
//       .populate("player1 player2 pair1 pair2 winner")
//       .populate("createdBy updatedBy", "name email");

//     if (!match) {
//       return res.status(404).json({ message: "Match not found" });
//     }

//     res.status(200).json({ match });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // Helper Functions
// function isPowerOfTwo(n) {
//   return n > 0 && (n & (n - 1)) === 0;
// }

// // FIXED: Properly handle both Single and Pair formats
// async function generateFirstRoundMatches(
//   entries,
//   tournamentId,
//   knockoutStageId,
//   userId,
//   format
// ) {
//   const matches = [];
//   const shuffledEntries = [...entries].sort(() => Math.random() - 0.5);
//   const round = await Round.findOne({ tournamentId, roundNumber: 1 });
//   const matchDate = round?.date || null;

//   for (let i = 0; i < shuffledEntries.length; i += 2) {
//     const matchData = {
//       tournamentId,
//       knockoutStageId,
//       matchNumber: i / 2 + 1,
//       round: 1,
//       status: "scheduled",
//       createdBy: userId,
//       matchType: format,
//       date: matchDate,
//     };

//     // Set player or pair based on format
//     if (format === "Pairs") {
//       matchData.pair1Id = shuffledEntries[i].pairId;
//       matchData.pair2Id = shuffledEntries[i + 1].pairId;
//       const pair1 = await TournamentPlayer.findOne({
//         tournamentId,
//         pairId: shuffledEntries[i].pairId,
//         isActive: true,
//       });
//       const pair2 = await TournamentPlayer.findOne({
//         tournamentId,
//         pairId: shuffledEntries[i + 1].pairId,
//         isActive: true,
//       });
//       if (pair1) {
//         pair1.assignMatch = true;
//         await pair1.save();
//       }
//       if (pair2) {
//         pair2.assignMatch = true;
//         await pair2.save();
//       }
//     } else {
//       matchData.player1Id = shuffledEntries[i].playerId;
//       matchData.player2Id = shuffledEntries[i + 1].playerId;
//       const player1 = await TournamentPlayer.findOne({
//         tournamentId,
//         playerId: shuffledEntries[i].playerId,
//       });
//       const player2 = await TournamentPlayer.findOne({
//         tournamentId,
//         playerId: shuffledEntries[i + 1].playerId,
//       });
//       if (player1) {
//         player1.assignMatch = true;
//         await player1.save();
//       }
//       if (player2) {
//         player2.assignMatch = true;
//         await player2.save();
//       }
//     }

//     matches.push(matchData);
//   }

//   return matches;
// }

// // FIXED: Properly handle winners based on format
// async function generateNextRoundMatches(
//   completedMatches,
//   nextRound,
//   tournamentId,
//   knockoutStageId,
//   userId
// ) {
//   const matches = [];
//   const tournament = await Tournament.findById(tournamentId);

//   if (!tournament) {
//     throw new AppError(404, false, "Tournament not found");
//   }

//   for (let i = 0; i < completedMatches.length; i += 2) {
//     const match1 = completedMatches[i];
//     const match2 = completedMatches[i + 1];

//     if (!match1 || !match1.winner) {
//       throw new AppError(500, false, `Match ${i} does not have a winner`);
//     }

//     const round = await Round.findOne({ tournamentId, roundNumber: nextRound });
//     if (!round) {
//       throw new AppError(500, false, `Round ${nextRound} not found`);
//     }
//     const matchDate = round?.date || null;

//     const matchData = {
//       tournamentId,
//       knockoutStageId,
//       matchNumber: i / 2 + 1,
//       round: nextRound,
//       status: "scheduled",
//       createdBy: userId,
//       matchType: tournament.format,
//       date: matchDate,
//     };

//     // Set winners based on format
//     if (tournament.format === "Pairs") {
//       matchData.pair1Id = match1.winner;
//       matchData.pair2Id = match2?.winner || null;
//     } else {
//       matchData.player1Id = match1.winner;
//       matchData.player2Id = match2?.winner || null;
//     }

//     matches.push(matchData);
//   }

//   return matches;
// }
