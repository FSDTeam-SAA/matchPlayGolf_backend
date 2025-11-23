import Payment from "./payment.model.js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

class PaymentService {
  /**
   * Create Stripe Checkout Session
   */
  async createCheckoutSession(tournamentData, userId) {
    try {
      const { tournamentId, tournamentName, amount } = tournamentData;

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: tournamentName,
                description: `Tournament Registration - ${tournamentName}`
              },
              unit_amount: Math.round(parseFloat(amount) * 100) // Convert to cents
            },
            quantity: 1
          }
        ],
        mode: "payment",
        success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
        metadata: {
          tournamentId: tournamentId.toString(),
          userId: userId.toString()
        },
        customer_email: tournamentData.email || undefined
      });

      // Create pending payment record
      const payment = await Payment.create({
        tournamentId,
        amount,
        cardNumber: "Pending",
        cardName: "Pending",
        transactionId: session.id,
        stripePaymentIntentId: session.payment_intent || session.id,
        stripeSessionId: session.id,
        status: "pending",
        paymentMethod: "card"
      });
      
      return {
        sessionId: session.id,
        checkoutUrl: session.url,
        transactionId: payment.transactionId
      };
    } catch (error) {
      throw new Error(`Failed to create checkout session: ${error.message}`);
    }
  }

  /**
   * Verify checkout session and update payment
   */
  async verifyCheckoutSession(sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (!session) {
        throw new Error("Session not found");
      }

      // Find payment record
      const payment = await Payment.findOne({ stripeSessionId: sessionId });

      if (!payment) {
        throw new Error("Payment record not found");
      }

      // Update payment with card details from session
      if (session.payment_status === "paid") {
        const paymentIntent = await stripe.paymentIntents.retrieve(
          session.payment_intent
        );

        const paymentMethod = await stripe.paymentMethods.retrieve(
          paymentIntent.payment_method
        );

        payment.cardNumber = `**** **** **** ${paymentMethod.card.last4}`;
        payment.cardName = paymentMethod.billing_details.name || "N/A";
        payment.status = "completed";
        payment.stripePaymentIntentId = session.payment_intent;
      } else {
        payment.status = this.mapStripeStatus(session.payment_status);
      }

      await payment.save();

      return {
        payment,
        session: {
          id: session.id,
          paymentStatus: session.payment_status,
          amountTotal: session.amount_total / 100,
          customerEmail: session.customer_email
        }
      };
    } catch (error) {
      throw new Error(`Failed to verify session: ${error.message}`);
    }
  }

  /**
   * Process direct card payment (without Checkout)
   */
  async processCardPayment(paymentData) {
    try {
      const { amount, cardNumber, cardName, expiryDate, cvv, tournamentId } = paymentData;

      // Parse expiry date
      const [expMonth, expYear] = expiryDate.split("/");
      const fullYear = expYear.length === 2 ? `20${expYear}` : expYear;

      // Create payment method with card details
      const paymentMethod = await stripe.paymentMethods.create({
        type: "card",
        card: {
          number: cardNumber.replace(/\s/g, ""),
          exp_month: parseInt(expMonth),
          exp_year: parseInt(fullYear),
          cvc: cvv
        },
        billing_details: {
          name: cardName
        }
      });

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(parseFloat(amount) * 100),
        currency: "usd",
        payment_method: paymentMethod.id,
        confirm: true,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: "never"
        },
        metadata: {
          tournamentId: tournamentId.toString()
        }
      });

      // Mask card number
      const maskedCardNumber = this.maskCardNumber(cardNumber);

      // Create payment record
      const payment = await Payment.create({
        tournamentId,
        amount,
        cardNumber: maskedCardNumber,
        cardName,
        transactionId: paymentIntent.id,
        stripePaymentIntentId: paymentIntent.id,
        status: this.mapStripeStatus(paymentIntent.status),
        paymentMethod: "card"
      });

      return {
        transactionId: payment.transactionId,
        stripePaymentIntentId: payment.stripePaymentIntentId,
        status: payment.status,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        maskedCardNumber: payment.cardNumber,
        createdAt: payment.createdAt
      };
    } catch (error) {
      if (error.type === "StripeCardError") {
        throw new Error(`Card error: ${error.message}`);
      } else if (error.type === "StripeInvalidRequestError") {
        throw new Error(`Invalid request: ${error.message}`);
      } else {
        throw new Error(`Payment processing failed: ${error.message}`);
      }
    }
  }

  /**
   * Map Stripe status to our status
   */
  mapStripeStatus(stripeStatus) {
    const statusMap = {
      succeeded: "completed",
      paid: "completed",
      processing: "pending",
      requires_payment_method: "pending",
      requires_confirmation: "pending",
      requires_action: "pending",
      canceled: "failed",
      unpaid: "failed",
      requires_capture: "pending"
    };
    return statusMap[stripeStatus] || "pending";
  }

  /**
   * Mask card number for security
   */
  maskCardNumber(cardNumber) {
    const cleaned = cardNumber.replace(/\s/g, "");
    const lastFour = cleaned.slice(-4);
    return `**** **** **** ${lastFour}`;
  }

  /**
   * Get payment by transaction ID
   */
  async getPaymentByTransactionId(transactionId) {
    try {
      const payment = await Payment.findOne({ transactionId }).populate(
        "tournamentId",
        "tournamentName sportName"
      );

      if (!payment) {
        throw new Error("Payment not found");
      }

      return payment;
    } catch (error) {
      throw new Error(`Failed to fetch payment: ${error.message}`);
    }
  }

  /**
   * Get payments by tournament ID
   */
  async getPaymentsByTournament(tournamentId) {
    try {
      const payments = await Payment.find({ tournamentId }).sort({
        createdAt: -1
      });

      return payments;
    } catch (error) {
      throw new Error(`Failed to fetch payments: ${error.message}`);
    }
  }

  /**
   * Refund payment
   */
  async refundPayment(transactionId, amount = null) {
    try {
      const payment = await Payment.findOne({ transactionId });

      if (!payment) {
        throw new Error("Payment not found");
      }

      if (payment.status !== "completed") {
        throw new Error("Can only refund completed payments");
      }

      const refundData = {
        payment_intent: payment.stripePaymentIntentId
      };

      if (amount) {
        refundData.amount = Math.round(parseFloat(amount) * 100);
      }

      const refund = await stripe.refunds.create(refundData);

      payment.status = "refunded";
      payment.refundId = refund.id;
      await payment.save();

      return {
        refundId: refund.id,
        status: refund.status,
        amount: refund.amount / 100
      };
    } catch (error) {
      throw new Error(`Failed to refund payment: ${error.message}`);
    }
  }
}

export default new PaymentService();