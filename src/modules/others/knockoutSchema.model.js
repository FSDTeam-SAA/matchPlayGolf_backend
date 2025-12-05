import  mongoose from 'mongoose';

const knockoutStageSchema = new mongoose.Schema({
  isActive: { type: Boolean, default: false },
  currentRound: { type: Number, default: 1 },
  totalRounds: { type: Number },
  matches: [{ 
   type: mongoose.Schema.Types.ObjectId, 
   ref: "Match" 
  }],
  onHold: { type: Boolean, default: false },
  holdReason: { type: String }
});

const knockoutSchema = mongoose.models.KnockoutSchema || mongoose.model("KnockoutSchema", knockoutStageSchema);
export default knockoutSchema;