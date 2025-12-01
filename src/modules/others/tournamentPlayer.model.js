// src/models/TournamentPlayer.model.js
import  mongoose from 'mongoose';

const tournamentPlayerSchema = new mongoose.Schema({

  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true,
  },
  playerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  pairId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pair',
  },
  firstName: String,
  lastName: String,
  handicap: {
    type: Number,
    min: 0,
    max: 54,
  },
  // invitationStatus: {
  //   type: String,
  //   enum: Object.values(INVITATION_STATUS),
  //   default: INVITATION_STATUS.PENDING,
  // },
  invitationSentAt: Date,
  invitationToken: {
    type: String,
    unique: true,
    sparse: true,
  },
  registeredAt: Date,
  isActive: {
    type: Boolean,
    default: true,
  },
  notes: String,
}, {
  timestamps: true,
});

const tournamentPlayer = mongoose.models.TournamentPlayer || mongoose.model("TournamentPlayer", tournamentPlayerSchema);
export default tournamentPlayer;

// module.exports = mongoose.model('TournamentPlayer', tournamentPlayerSchema);
