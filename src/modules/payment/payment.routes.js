// import express from "express";
// import {
//   createTournament,
//   getAllTournaments,
//   getTournamentById,
//   updateTournament,
//   deleteTournament,
//   getTournamentsByCreator,
//   createTournamentCheckout
// } from "./tournament/tournament.controller.js";
// import {
//   createCheckoutSession,
//   verifyCheckoutSession,
//   getPaymentByTransactionId,
//   getPaymentsByTournament,
//   refundPayment
// } from "./payment/payment.controller.js";
// import { handleStripeWebhook } from "./webhook/webhook.controller.js";
// import { authenticate, adminOnly } from "./middleware/auth.middleware.js";

// const router = express.Router();

// // Tournament routes
// router.post("/tournaments", authenticate, createTournament);
// router.get("/tournaments", getAllTournaments);
// router.get("/tournaments/:id", getTournamentById);
// router.put("/tournaments/:id", authenticate, updateTournament);
// router.delete("/tournaments/:id", authenticate, deleteTournament);
// router.get("/tournaments/creator/me", authenticate, getTournamentsByCreator);

// // Tournament checkout route
// router.post("/tournaments/:id/checkout", authenticate, createTournamentCheckout);

// // Payment routes
// router.post("/payments/create-checkout-session", authenticate, createCheckoutSession);
// router.get("/payments/verify-session/:sessionId", authenticate, verifyCheckoutSession);
// router.get("/payments/:transactionId", authenticate, getPaymentByTransactionId);
// router.get("/payments/tournament/:tournamentId", authenticate, getPaymentsByTournament);
// router.post("/payments/:transactionId/refund", authenticate, adminOnly, refundPayment);

// // Webhook routes (Important: Must use raw body parser)
// router.post("/webhooks/stripe", express.raw({ type: "application/json" }), handleStripeWebhook);

// export default router;