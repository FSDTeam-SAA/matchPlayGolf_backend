import mongoose from "mongoose";

const PlayerStatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    score: {
      type: Number,
      default: 0
    },
    strokes: {
      type: Number,
      default: 0
    },
    points: {
      type: Number,
      default: 0
    },
    result:{
      type: String
    },
    holeStats: [
      {
        hole: { type: Number },
        strokes: { type: Number },
        fairwayHit: { type: Boolean },
        greenInRegulation: { type: Boolean },
        putts: { type: Number }
      }
    ]
  },
  { _id: false }
);

const TeamSchema = new mongoose.Schema(
  {
    teamName: {
      type: String,
      trim: true
    },
    players: {
      type: [PlayerStatSchema],
      required: true
    },
    totalScore: {
      type: Number,
      default: 0
    },
    result:{
      type:String
    },
    handicap: {
      type: Number
    },
    rank: {
      type: Number
    }
  },
  { _id: false }
);

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
      enum: ["single", "pair", "team"],
      required: true
    },
    players: [PlayerStatSchema],
    teams: [TeamSchema],
    status: {
      type: String,
      enum: ["Upcoming", "In Progress", "Completed", "Cancelled"],
      default: "Upcoming"
    },
    teeTime: {
      type: Date,
    },
    startingHole: {
      type: Number,
      default: 1
    },
    groupNumber: {
      type: Number
    },
    winnerTeamId: {
      type: mongoose.Schema.Types.ObjectId
    },
    winnerPlayerId: {
      type: mongoose.Schema.Types.ObjectId
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
},
{
    timestamps:true
}
);

// Indexes
MatchSchema.index({ roundId: 1, teeTime: 1 });
MatchSchema.index({ tournamentId: 1 });

const Match = mongoose.models.Match || mongoose.model("Match", MatchSchema);

export default Match;
