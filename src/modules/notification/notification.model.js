import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["MATCH_CREATED", "MATCH_UPDATED", "MATCH_DELETED"],
      required: true,
    },

    // Stores full match data object (not just ID)
    match: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    timestamp: {
      type: Date,
      default: Date.now,
    }
  },
  {
    timestamps: true, // adds createdAt & updatedAt
  }
);

const Notification = mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);

export default Notification;