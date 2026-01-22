import AppError from "../../middleware/errorHandler.js";
import paymentService from "./payment.service.js";


export const createCheckoutSession = async (amount, email, tournamentId, tournamentName, userId) => {
  try {
    console.log('1');
    if (!tournamentId || !tournamentName || !amount) {
      throw new AppError(400, false, "Tournament ID, name, and amount are required");
    }
    console.log('2');

    const tournamentData = {
      tournamentId,
      tournamentName,
      amount,
      email
    };
    console.log('3')
    const result = await paymentService.createCheckoutSession(
      tournamentData,
      userId
    );

    return result;
  } catch (error) {
    throw new AppError(500, false, error.message);
  }
};

export const verifyCheckoutSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await paymentService.verifyCheckoutSession(sessionId);

    res.status(200).json({
      success: true,
      data: result,
      message: "Session verified successfully"
    });
  } catch (error) {
    const statusCode = error.message.includes("not found") ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
};

export const getPaymentBystripeSessionId = async (req, res) => {
  try {
    console.log("Fetching payment for Stripe Session ID:", req.params.stripeSessionId);
    const payment = await paymentService.getPaymentByStripeSessionId(
      req.params.stripeSessionId
    );

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    const statusCode = error.message === "Payment not found" ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
};

export const getPaymentsByTournament = async (req, res) => {
  try {
    const payments = await paymentService.getPaymentsByTournament(
      req.params.tournamentId
    );

    res.status(200).json({
      success: true,
      data: payments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const refundPayment = async (req, res) => {
  try {
    const { amount } = req.body;

    if (req.user.role !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can process refunds"
      });
    }

    const result = await paymentService.refundPayment(
      req.params.transactionId,
      amount
    );

    res.status(200).json({
      success: true,
      data: result,
      message: "Payment refunded successfully"
    });
  } catch (error) {
    const statusCode = error.message.includes("not found") ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
};