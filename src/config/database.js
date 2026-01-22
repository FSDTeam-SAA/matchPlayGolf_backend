// ============================================
// FILE: src/config/database.js
// ============================================

import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGO_URI;

export const connectDatabase = async () => {
  try {


    await mongoose.connect(MONGODB_URI);
    
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    throw error;
  }
};