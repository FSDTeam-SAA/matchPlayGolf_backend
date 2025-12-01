import mongoose from "mongoose";

const RoundSchema = new mongoose.Schema(
  {
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tournament",
      required: true
    },
    roundName: {
      type: String,
      trim: true
    },
    roundNumber: {
      type: Number,
    },
    date: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ["Scheduled", "In Progress", "Completed", "Cancelled"],
      default: "Scheduled"
    },
    weatherConditions: {
      type: String,
      trim: true
    },
    notes: {
      type: String,
      trim: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

// Indexes
RoundSchema.index({ tournamentId: 1, roundNumber: 1 });
RoundSchema.index({ date: 1 });

const Round = mongoose.models.Round || mongoose.model("Round", RoundSchema);

export default Round;