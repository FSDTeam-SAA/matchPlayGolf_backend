// ============================================
// FILE: src/app.js (Main Application)
// ============================================

import express from 'express';
import dotenv from 'dotenv';
import { applyMiddleware } from './middleware/security.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import routes from './routes/index.js';
import { handleStripeWebhook } from './modules/payment/webhook.controller.js';

dotenv.config();

const app = express();

// ------------------------------------------------------------
// 1️⃣ Stripe Webhook (MUST COME FIRST - before JSON middleware)
// ------------------------------------------------------------
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }), // RAW BODY ONLY FOR WEBHOOK
  handleStripeWebhook
);

// ------------------------------------------------------------
// 2️⃣ Now apply normal middleware for all other routes
// ------------------------------------------------------------
applyMiddleware(app);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api', routes);

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;
