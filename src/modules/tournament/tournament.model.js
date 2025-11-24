import mongoose from "mongoose";

const TournamentSchema = new mongoose.Schema(
  {
    orderId:{
      type:String
    },
    tournamentName: {
      type: String,
      required: true,
      trim: true
    },
    sportName: {
      type: String,
      default: "golf"
    },
    drawFormat: {
      type: String,
      enum: ["Matrix", "Knockout", "Teams"],
      default: "Matrix"
    },
    format: {
      type: String,
      enum: ["Single", "Pair", "Team"],
      default: "Single"
    },
    drawSize: {
      type: Number,
      default: 16
    },
    billingAddress: {
      fullName: { type: String },
      email: { type: String },
      phone: { type: String },
      country: { type: String },
      streetAddress: { type: String },   // fixed spelling
      city: { type: String },
      district: { type: String },
      zipcode: { type: String }          // fixed "types"
    },
    price: {
      type: String
    },
    paymentMethod: {
      type: String
    },
    paymentStatus: {
      type: String,
      default: "pending"
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

const Tournament =
  mongoose.models.Tournament || mongoose.model("Tournament", TournamentSchema);

export default Tournament;
