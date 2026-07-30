import mongoose from "mongoose";

const TournamentReminderSchema = new mongoose.Schema(
  {
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tournament",
      required: true,
    },
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Match",
      required: true,
    },
    roundNumber: {
      type: Number,
      required: true,
    },
    recipientEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["processing", "sent", "failed"],
      default: "processing",
    },
    attempts: {
      type: Number,
      default: 0,
    },
    claimedAt: Date,
    sentAt: Date,
    failedAt: Date,
    lastError: String,
  },
  { timestamps: true }
);

TournamentReminderSchema.index(
  { tournamentId: 1, roundNumber: 1, recipientEmail: 1 },
  { unique: true }
);
TournamentReminderSchema.index({ status: 1, claimedAt: 1 });

const TournamentReminder =
  mongoose.models.TournamentReminder ||
  mongoose.model("TournamentReminder", TournamentReminderSchema);

export default TournamentReminder;
