import Stripe from "stripe";
import Payment from "../payment/payment.model.js";
import Tournament from "../tournament/tournament.model.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * @desc    Handle Stripe webhook events
 * @route   POST /api/webhooks/stripe
 * @access  Public (but verified by Stripe signature)
 */
export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // ✅ Verify webhook signature with RAW body
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    console.log("Webhook verified:", event.type, req.body);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object);
        break;

      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object);
        break;

      case "charge.refunded":
        await handleChargeRefunded(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // ✅ Return 200 with simple response
    res.status(200).send({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    res.status(500).send(`Webhook Error: ${error.message}`);
  }
};
/**
 * Handle checkout session completed
 */
async function handleCheckoutSessionCompleted(session) {
  try {

    const payment = await Payment.findOne({ stripeSessionId: session.id });

    if (!payment) {
      console.error("Payment record not found for session:", session.id);
      return;
    }

    // Retrieve payment intent to get card details
    if (session.payment_intent) {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        session.payment_intent
      );

      if (paymentIntent.payment_method) {
        const paymentMethod = await stripe.paymentMethods.retrieve(
          paymentIntent.payment_method
        );

        payment.cardNumber = `**** **** **** ${paymentMethod.card.last4}`;
        payment.cardName = paymentMethod.billing_details.name || "N/A";
      }

      payment.stripePaymentIntentId = session.payment_intent;
    }

    payment.status = "completed";
    await payment.save();

    // Update tournament payment status
    const tournament = await Tournament.findById(payment.tournamentId);
   
    if (tournament) {
      tournament.paymentStatus = "completed";
      tournament.paymentMethod = "card";
      await tournament.save();
    }

  } catch (error) {
    console.error("Error handling checkout session:", error);
  }
}

/**
 * Handle payment intent succeeded
 */
async function handlePaymentIntentSucceeded(paymentIntent) {
  try {
    console.log("Payment intent succeeded:", paymentIntent.id);

    // ✅ Try multiple search strategies
    let payment = await Payment.findOne({
      stripePaymentIntentId: paymentIntent.id
    });

    // If not found, try finding by session ID from metadata
    if (!payment && paymentIntent.metadata?.sessionId) {
      payment = await Payment.findOne({
        stripeSessionId: paymentIntent.metadata.sessionId
      });
    }

    if (!payment) {
      console.error("Payment record not found for intent:", paymentIntent.id);
      return;
    }

    payment.status = "completed";
    payment.stripePaymentIntentId = paymentIntent.id; // ✅ Set it here too
    await payment.save();

    // Update tournament payment status
    const tournament = await Tournament.findById(payment.tournamentId);
    if (tournament) {
      tournament.paymentStatus = "completed";
      tournament.paymentMethod = "card";
      await tournament.save();
    }

    console.log("Payment succeeded:", payment.transactionId);
  } catch (error) {
    console.error("Error handling payment intent succeeded:", error);
  }
}

/**
 * Handle payment intent failed
 */
async function handlePaymentIntentFailed(paymentIntent) {
  try {
    console.log("Payment intent failed:", paymentIntent.id);

    const payment = await Payment.findOne({
      stripePaymentIntentId: paymentIntent.id
    });

    if (!payment) {
      console.error("Payment record not found for intent:", paymentIntent.id);
      return;
    }

    payment.status = "failed";
    await payment.save();

    // Update tournament payment status
    const tournament = await Tournament.findById(payment.tournamentId);
    if (tournament) {
      tournament.paymentStatus = "failed";
      await tournament.save();
    }

    console.log("Payment failed:", payment.transactionId);
  } catch (error) {
    console.error("Error handling payment intent failed:", error);
  }
}

/**
 * Handle charge refunded
 */
async function handleChargeRefunded(charge) {
  try {
    console.log("Charge refunded:", charge.id);

    const payment = await Payment.findOne({
      stripePaymentIntentId: charge.payment_intent
    });

    if (!payment) {
      console.error("Payment record not found for charge:", charge.id);
      return;
    }

    payment.status = "refunded";
    payment.refundId = charge.refunds.data[0]?.id;
    await payment.save();

    // Update tournament payment status
    const tournament = await Tournament.findById(payment.tournamentId);
    if (tournament) {
      tournament.paymentStatus = "refunded";
      await tournament.save();
    }

    console.log("Payment refunded:", payment.transactionId);
  } catch (error) {
    console.error("Error handling charge refunded:", error);
  }
}