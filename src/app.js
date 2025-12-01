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

dotenv.config();

const app = express();

// ---------------------------------------------
// 1️⃣ CORS Setup (MUST BE FIRST!)
// ---------------------------------------------
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173", // Add Vite default port if using Vite
  "https://your-frontend-domain.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log(`⚠️ Blocked CORS request from origin: ${origin}`);
        callback(null, false); // Don't throw error, just reject
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
    ],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

// ---------------------------------------------
// 2️⃣ Security Middleware (after CORS)
// ---------------------------------------------
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Important for CORS
    contentSecurityPolicy: false, // Disable if it's blocking requests
  })
);
app.use(xssClean());
app.use(mongoSanitize());

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