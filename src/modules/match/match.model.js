// import mongoose from "mongoose";

// // ---------------- PLAYER STATS ----------------
// const PlayerStatSchema = new mongoose.Schema(
//   {
//     userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true
//     },
//     score: { type: Number, default: 0 },
//     strokes: { type: Number, default: 0 },
//     points: { type: Number, default: 0 },
//     result: { type: String },

//     holeStats: [
//       {
//         hole: Number,
//         strokes: Number,
//         fairwayHit: Boolean,
//         greenInRegulation: Boolean,
//         putts: Number
//       }
//     ]
//   },
//   { _id: false }
// );

// // ---------------- TEAM STATS ----------------
// const TeamSchema = new mongoose.Schema(
//   {
//     pairId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "TournamentPair"
//     },
//     teamName: String,

//     players: {
//       type: [PlayerStatSchema],
//       required: true
//     },

//     totalScore: { type: Number, default: 0 },
//     result: { type: String },
//     handicap: Number,
//     rank: Number
//   },
//   { _id: false }
// );

// // ---------------- MATCH SCHEMA ----------------
// const MatchSchema = new mongoose.Schema(
//   {
//     tournamentId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Tournament",
//       required: true
//     },

//     roundId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Round",
//       required: true
//     },

//     matchType: {
//       type: String,
//       enum: ["Single", "Pair"],
//       required: true
//     },

//     // ----- SINGLE MATCH -----
//     player1Id: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User"
//     },
//     player2Id: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User"
//     },

//     players: [PlayerStatSchema], // single-player stats

//     // ----- PAIR MATCH -----
//     pair1Id: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "TournamentPair"
//     },
//     pair2Id: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "TournamentPair"
//     },
//     players: [PlayerStatSchema], // single-player stats-

//     player1Score: { type: Number, default: 0 },
//     player2Score: { type: Number, default: 0 },
//     pair1Score: { type: Number, default: 0 },
//     pair2Score: { type: Number, default: 0 },

//     // player1Color: { type: String,  },
//     // player2Color: { type: String,  },
//     // pair1Color: { type: String,  },
//     winnerColor: { type: String },


//     teams: [TeamSchema], // pair-team stats

//     status: {
//       type: String,
//       enum: ["Upcoming", "In Progress", "Completed", "Cancelled"],
//       default: "Upcoming"
//     },

//     score: {
//       type: Number,
//       default: 0
//     },
//     time: Date,


//     date: {
//       type: Date,
//       default: Date.now
//     },

//     startingHole: { type: Number, default: 1 },
//     groupNumber: Number,

//     winnerTeamId: mongoose.Schema.Types.ObjectId,   // for Pair
//     winnerPlayerId: mongoose.Schema.Types.ObjectId, // for Single

//     venue: { type: String },

//     // ✅ NEW FIELDS MOVED FROM MATCH-RESULT
//     comments: {
//       type: String,
//       default: ""
//     },
//     photo: {
//       type: String,
//       default: ""
//     },

//     createdBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true
//     },
//     updatedBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User"
//     }
//   },
//   { timestamps: true }
// );

// MatchSchema.index({ roundId: 1, teeTime: 1 });
// MatchSchema.index({ tournamentId: 1 });

// export default mongoose.models.Match || mongoose.model("Match", MatchSchema);


// models/knockoutMatch.model.js
import mongoose from "mongoose";

const knockoutMatchSchema = new mongoose.Schema({
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true
  },
  knockoutStageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'KnockoutStage',
    required: true
  },
  matchNumber: { type: Number, required: true },
  round: { type: Number, required: true }, // 1 = Round of 16, 2 = Quarterfinals, etc.
  
  // For Singles
  player1: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    default: null 
  },
  player2: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    default: null 
  },
  
  // For Pairs
  pair1: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'TournamentPair',
    default: null 
  },
  pair2: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'TournamentPair',
    default: null 
  },
  
  winner: { 
    type: mongoose.Schema.Types.ObjectId, 
    refPath: 'winnerModel',
    default: null 
  },
  winnerModel: {
    type: String,
    // enum: ['User', 'TournamentPair'],
    default: 'User'
  },
  
  player1Score: { type: Number, default: 0 },
  player2Score: { type: Number, default: 0 },
  pair1Score: { type: Number, default: 0 },
  pair2Score: { type: Number, default: 0 },
  
  date: { type: Date },
  time: { type: String },
  
  status: {
    type: String,
    enum: ['pending', 'scheduled', 'in-progress', 'completed', 'rescheduled'],
    default: 'pending'
  },
  
  venue: { type: String },
  notes: { type: String },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Indexes
knockoutMatchSchema.index({ tournamentId: 1, round: 1 });
knockoutMatchSchema.index({ knockoutStageId: 1 });

export default mongoose.models.Match || mongoose.model("Match", knockoutMatchSchema);