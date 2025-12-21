// models/knockoutStage.model.js
import mongoose from "mongoose";

const knockoutStageSchema = new mongoose.Schema({
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true,
    unique: true
  },
  isActive: { type: Boolean, default: false },
  currentRound: { type: Number, default: 1 },
  totalRounds: { type: Number, required: true },
  onHold: { type: Boolean, default: false },
  holdReason: { type: String },
  
  // Optional: Store match IDs for quick reference
  matchIds: [{
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'Match'
  }],
  date: { type: Date },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Index
knockoutStageSchema.index({ tournamentId: 1 });

export default mongoose.models.KnockoutStage || mongoose.model("KnockoutStage", knockoutStageSchema);