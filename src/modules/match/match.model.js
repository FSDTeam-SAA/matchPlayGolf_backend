import mongoose from "mongoose";

// ---------------- PLAYER STATS ----------------
const PlayerStatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    score: { type: Number, default: 0 },
    strokes: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    result: { type: String },

    holeStats: [
      {
        hole: Number,
        strokes: Number,
        fairwayHit: Boolean,
        greenInRegulation: Boolean,
        putts: Number
      }
    ]
  },
  { _id: false }
);

// ---------------- TEAM STATS ----------------
const TeamSchema = new mongoose.Schema(
  {
    pairId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TournamentPair"
    },
    teamName: String,

    players: {
      type: [PlayerStatSchema],
      required: true
    },

    totalScore: { type: Number, default: 0 },
    result: { type: String },
    handicap: Number,
    rank: Number
  },
  { _id: false }
);

// ---------------- MATCH SCHEMA ----------------
const MatchSchema = new mongoose.Schema(
  {
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tournament",
      required: true
    },

    roundId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Round",
      required: true
    },

    matchType: {
      type: String,
      enum: ["Single", "Pair"],
      required: true
    },

    // ----- SINGLE MATCH -----
    player1Id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    player2Id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    players: [PlayerStatSchema], // single-player stats

    // ----- PAIR MATCH -----
    pair1Id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TournamentPair"
    },
    pair2Id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TournamentPair"
    },

    teams: [TeamSchema], // pair-team stats

    status: {
      type: String,
      enum: ["Upcoming", "In Progress", "Completed", "Cancelled"],
      default: "Upcoming"
    },

    score: {
      type: Number,
      default: 0
    },

    date: {
      type: Date,
      default: Date.now
    },

    teeTime: Date,
    startingHole: { type: Number, default: 1 },
    groupNumber: Number,

    winnerTeamId: mongoose.Schema.Types.ObjectId,   // for Pair
    winnerPlayerId: mongoose.Schema.Types.ObjectId, // for Single

    // ✅ NEW FIELDS MOVED FROM MATCH-RESULT
    comments: {
      type: String,
      default: ""
    },
    photo: {
      type: String,
      default: ""
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

MatchSchema.index({ roundId: 1, teeTime: 1 });
MatchSchema.index({ tournamentId: 1 });

export default mongoose.models.Match || mongoose.model("Match", MatchSchema);