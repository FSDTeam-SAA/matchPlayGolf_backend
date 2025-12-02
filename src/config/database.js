// ============================================
// FILE: src/config/database.js
// ============================================

import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

const MONGODB_URI = process.env.MONGODB_URI || 
  "mongodb+srv://fsdteamsaa:7skzQQLzi0conWhl@cluster0.fnmxebl.mongodb.net/match_play_golf?retryWrites=true&w=majority&appName=Cluster0";

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