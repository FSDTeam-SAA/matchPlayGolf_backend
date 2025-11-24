// src/modules/match/match.model.js
import mongoose from 'mongoose';

const MatchSchema = new mongoose.Schema(
  {
    
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    
    matchDate: {
      type: Date,
      required: true,
    },


    matchTime: {
      type: String,
      default: '',
    },

    
    team1: {
      type: String,
      required: false,
    },
    team2: {
      type: String,
      required: false,
    },

  
    player1: {
      type: String,
      required: false,
    },
    player2: {
      type: String,
      required: false,
    },

   
    matchName: {
      type: String,
      required: true,
    },

   
    yourScore: {
      type: Number,
      required: true,
    },
    opponentScore: {
      type: Number,
      required: true,
    },

   
    comments: {
      type: String,
      default: '',
    },

   
    photo: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

const Match =
  mongoose.models.Match || mongoose.model('Match', MatchSchema);

export default Match;
