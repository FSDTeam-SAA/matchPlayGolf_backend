// // ============================================
// // FILE: src/app.js (Main Application)
// // ============================================

// import express from 'express';
// import dotenv from 'dotenv';
// import { applyMiddleware } from './middleware/security.js';
// import { errorHandler } from './middleware/errorHandler.js';
// import { notFound } from './middleware/notFound.js';
// import routes from './routes/index.js';
// import { handleStripeWebhook } from './modules/payment/webhook.controller.js';
// import helmet from 'helmet';
// import cors from 'cors';
// import xssClean from 'xss-clean';
// import mongoSanitize from 'express-mongo-sanitize';

// dotenv.config();

// const app = express();

// app.use(helmet());
// app.use(
//     cors({
//       origin: "*",
//       credentials: true,
//       methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     })
//   );
// app.use(xssClean());
// app.use(mongoSanitize());

// // ------------------------------------------------------------
// // 1️⃣ Stripe Webhook (MUST COME FIRST - before JSON middleware)
// // ------------------------------------------------------------
// app.post(
//   "/api/stripe/webhook",
//   express.raw({ type: "application/json" }), // RAW BODY ONLY FOR WEBHOOK
//   handleStripeWebhook
// );

// // ------------------------------------------------------------
// // 2️⃣ Now apply normal middleware for all other routes
// // ------------------------------------------------------------
// applyMiddleware(app);

// // Health check
// app.get('/health', (req, res) => {
//   res.status(200).json({
//     status: 'success',
//     message: 'Server is healthy',
//     timestamp: new Date().toISOString(),
//   });
// });

// // API routes
// app.use('/api', routes);

// // Error handling
// app.use(notFound);
// app.use(errorHandler);

// export default app;

// ============================================
// FILE: src/app.js (Main Application)
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
// 1️⃣ Security Middleware
// ---------------------------------------------
app.use(helmet());           // Secure HTTP headers
app.use(xssClean());         // Prevent XSS attacks
app.use(mongoSanitize());    // Prevent NoSQL injection

// ---------------------------------------------
// 2️⃣ CORS Setup
// ---------------------------------------------
const allowedOrigins = [
  "http://localhost:3000",
  "https://your-frontend-domain.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true, // Allow cookies, authorization headers
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
    ],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

// ---------------------------------------------
// 3️⃣ Stripe Webhook (must be before JSON middleware)
// ---------------------------------------------
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

// ---------------------------------------------
// 4️⃣ Body parser for normal routes
// ---------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply additional middleware
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

