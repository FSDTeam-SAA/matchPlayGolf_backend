// ============================================
// FILE: src/app.js (Fixed CORS Configuration)
// ============================================

import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import xssClean from 'xss-clean';
import mongoSanitize from 'express-mongo-sanitize';
import { applyMiddleware } from './middleware/security.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import routes from './routes/index.js';
import { handleStripeWebhook } from './modules/payment/webhook.controller.js';
import cookieParser from 'cookie-parser';

dotenv.config();

const app = express();

// ---------------------------------------------
// 1️⃣ CORS Setup (MUST BE FIRST!)
// ---------------------------------------------
app.use(
  cors({
    origin: "*",
    credentials:true
  })
);

// ---------------------------------------------
// 2️⃣ Security Middleware (after CORS)
// ---------------------------------------------

app.use(xssClean());
app.use(mongoSanitize());
app.use(cookieParser());

// ---------------------------------------------
// 3️⃣ Stripe Webhook (before body parsers)
// ---------------------------------------------
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

// ---------------------------------------------
// 4️⃣ Body Parsers (for all other routes)
// ---------------------------------------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply additional middleware (make sure this doesn't add another body parser!)
applyMiddleware(app);

// ---------------------------------------------
// 5️⃣ Health Check
// ---------------------------------------------
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------
// 6️⃣ API Routes
// ---------------------------------------------
app.use('/api', routes);

// ---------------------------------------------
// 7️⃣ Error Handling
// ---------------------------------------------
app.use(notFound);
app.use(errorHandler);

export default app;