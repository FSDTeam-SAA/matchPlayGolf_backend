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
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TournamentPlayer',
    required: true,
  },
  player2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TournamentPlayer',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('TournamentPair', tournamentPairSchema);