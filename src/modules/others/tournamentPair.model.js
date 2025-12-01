// src/models/TournamentPair.model.js
import  mongoose from 'mongoose';

const tournamentPairSchema = new mongoose.Schema({
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true,
  },
  teamName: String,
  player1: {
    type: mongoose.Schema.Types.ObjectId,
    ref:"User"
  },
  player2: {
    type: mongoose.Schema.Types.ObjectId,
    ref:"User"
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

const tournamentPair = mongoose.models.TournamentPair || mongoose.model("TournamentPair", tournamentPairSchema);
export default tournamentPair;