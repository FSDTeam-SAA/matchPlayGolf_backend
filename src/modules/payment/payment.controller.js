import paymentService from "./payment.service.js";

/**
 * @desc    Create Stripe Checkout Session
 * @route   POST /api/payments/create-checkout-session
 * @access  Private
 */
export const createCheckoutSession = async (amount, email, tournamentId, tournamentName, userId, res) => {
  try {

    if (!tournamentId || !tournamentName || !amount) {
      return res.status(400).json({
        success: false,
        message: "Tournament ID, name, and amount are required"
      });
    }

    const tournamentData = {
      tournamentId,
      tournamentName,
      amount,
      email
    };
    const result = await paymentService.createCheckoutSession(
      tournamentData,
      userId
    );

    return result;
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Verify Stripe Checkout Session
 * @route   GET /api/payments/verify-session/:sessionId
 * @access  Private
 */
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

/**
 * @desc    Get payment by transaction ID
 * @route   GET /api/payments/:transactionId
 * @access  Private
 */
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

/**
 * @desc    Get payments by tournament
 * @route   GET /api/payments/tournament/:tournamentId
 * @access  Private
 */
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

/**
 * @desc    Refund payment
 * @route   POST /api/payments/:transactionId/refund
 * @access  Private (Admin only)
 */
export const refundPayment = async (req, res) => {
  try {
    const { amount } = req.body;

    // Check if user is admin
    if (req.user.role !== "admin") {
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