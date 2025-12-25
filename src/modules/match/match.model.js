import mongoose from "mongoose";

const knockoutMatchSchema = new mongoose.Schema({
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true
  },
  roundId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Round'
  },
  knockoutStageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'KnockoutStage',
    required: true
  },
  matchNumber: { type: Number, required: true },
  round: { type: Number, required: true }, // 1 = Round of 16, 2 = Quarterfinals, etc.
  roundName: { type: String }, // e.g., "Quarterfinals"
  matchType: { 
    type: String, 
    enum: ["Single", "Pair", "Team"],
    required: true 
  },
  
  // For Singles
  player1Id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    default: null 
  },
  player2Id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    default: null 
  },
  
  // For Pairs
  pair1Id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'TournamentPair',
    default: null 
  },
  pair2Id: { 
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
  winnerColor: { type: String },
  
  player1Score: { type: Number, default: 0 },
  player2Score: { type: Number, default: 0 },
  pair1Score: { type: Number, default: 0 },
  pair2Score: { type: Number, default: 0 },
  
  date: { type: Date, default: Date.now },
  time: { type: String },
  
  status: {
    type: String,
    enum: ['pending', 'scheduled', 'in-progress', 'completed', 'rescheduled'],
    default: 'pending'
  },
  
  venue: { type: String },
  notes: { type: String },
  matchPhoto: [{ type: String }],
  comments: { type: String },
  
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