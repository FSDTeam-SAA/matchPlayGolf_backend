import mongoose from "mongoose";

const matchSchema = new mongoose.Schema({
  matchNumber: { type: Number, required: true },
  round: { type: Number, required: true }, // 1 = Round of 16, 2 = Quarterfinals, etc.
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
 pair1: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    default: null 
  },
  pair2: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    default: null 
  },
  winner: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    default: null 
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
  notes: { type: String }
}, { timestamps: true });

const knockoutStageSchema = new mongoose.Schema({
  isActive: { type: Boolean, default: false },
  currentRound: { type: Number, default: 1 },
  totalRounds: { type: Number },
  matches: [matchSchema],
  onHold: { type: Boolean, default: false },
  holdReason: { type: String }
});
 // IMPORTANT: embedded schema needs _id: false

export default knockoutStageSchema;
