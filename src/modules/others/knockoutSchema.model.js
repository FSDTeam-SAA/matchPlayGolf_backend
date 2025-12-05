import  mongoose from 'mongoose';

const knockoutStageSchema = new mongoose.Schema({
  isActive: { type: Boolean, default: false },
  currentRound: { type: Number, default: 1 },
  totalRounds: { type: Number },
  matches: [matchSchema],
  onHold: { type: Boolean, default: false },
  holdReason: { type: String }
});

const knockoutSchema = mongoose.models.knockoutSchema || mongoose.model("knockoutSchema", knockoutStageSchema);
export default knockoutSchema;