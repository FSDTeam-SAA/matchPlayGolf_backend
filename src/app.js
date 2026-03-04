import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { applyMiddleware } from './middleware/security.js';
import { notFound } from './middleware/notFound.js';
import routes from './routes/index.js';
import { handleStripeWebhook } from './modules/payment/webhook.controller.js';
import cookieParser from 'cookie-parser';

dotenv.config();

const app = express();
app.use(cookieParser());

// ---------------------------------------------
// 3️⃣ Stripe Webhook (before body parsers)
// ---------------------------------------------
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

app.use(express.json());
app.use(express.urlencoded({ extended: true}));

applyMiddleware(app);

app.use('/api', routes);
app.use('/hello-checker', (req, res) => {
  res.json({ message: 'Hello, Checker! i am mahabur' });
});

app.use(notFound);
// app.use(AppError);

app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    success: false,
    statusCode: err.statusCode || 500,
    message: err.message || 'Internal server error'
  });
});


export default app;