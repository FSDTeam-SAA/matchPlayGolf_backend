import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema(
  {
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tournament",
      required: true
    },
    amount: {
      type: String,
      required: true
    },
    cardNumber: {
      type: String,
      required: true
    },
    cardName: {
      type: String,
      required: true
    },
    transactionId: {
      type: String,
      required: true,
      unique: true
    },
    stripePaymentIntentId: {
      type: String,
      required: true
    },
    stripeSessionId: {
      type: String
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending"
    },
    paymentMethod: {
      type: String,
      default: "card"
    },
    refundId: {
      type: String
    }
  },
  { timestamps: true }
);

// Index for faster queries
PaymentSchema.index({ transactionId: 1 });
PaymentSchema.index({ stripePaymentIntentId: 1 });
PaymentSchema.index({ stripeSessionId: 1 });
PaymentSchema.index({ tournamentId: 1 });

const Payment =
  mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);

export default Payment;