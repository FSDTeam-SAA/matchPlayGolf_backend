// ============================================
// FILE: src/app.js (Main Application)
// ============================================

import express from 'express';
import dotenv from 'dotenv';
import { applyMiddleware } from './middleware/security.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import  routes  from './routes/index.js';
dotenv.config();

const app = express();

// Apply security and parsing middleware
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