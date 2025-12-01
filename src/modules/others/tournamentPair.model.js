// src/models/TournamentPair.model.js
const mongoose = require('mongoose');

const tournamentPairSchema = new mongoose.Schema({
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true,
  },
  teamName: String,
  player1: {
    fullName:String,
    email:String,
    Phone:String
  },
  player2: {
    fullName:String,
    email:String,
    Phone:String
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