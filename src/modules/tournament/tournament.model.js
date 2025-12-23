import mongoose from "mongoose";
import knockoutStageSchema from "../others/knockoutSchema.model.js";

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
      enum: ["Knockout", "Teams"],
      default: "Knockout"
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
      state: { type: String },
      zipcode: { type: String } ,
      companyName: { type: String }          // fixed "types"
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
    startDate:{
      type:Date,
      default:Date.now
    },
    endDate:{
      type: Date,
      default: Date.now
    },
    location:{
      type:String
    },
    numberOfSeeds:{
      type: Number
    },
    description:{
      type:String
    },
   status: {
      type: String,
      enum: ["upcoming", "in progress", "completed", "cancelled", "scheduled"],
      default: "upcoming"
    },
    rules: {
        type:String
      },
    totalParticipants: { type: Number, default: 0 },
    registeredPlayers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    totalRounds:{
      type:Number,
      default:0
    },
    rememberEmail: {
      type: Number,
      default: 0
    },
    // knockoutStage: knockoutSchema,
   knockoutStage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "KnockoutStage",
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  entryConditions: [{
    type: String
  }],
  range:[{ type: String }],
},
  { timestamps: true }
);

const Tournament =
  mongoose.models.Tournament || mongoose.model("Tournament", TournamentSchema);

export default Tournament;
