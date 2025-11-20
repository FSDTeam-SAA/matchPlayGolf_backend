// ============================================
// FILE: src/config/server.js
// ============================================

import http from 'http';
import { connectDatabase } from './database.js';
import { initializeSocket } from './socket.js';
import { logger } from '../utils/logger.js';

const PORT = process.env.PORT || 4000;

export const startServer = async (app) => {
  try {
    // Connect to database
    await connectDatabase();
    logger.info('✅ Database connected successfully');

    // Create HTTP server
    const httpServer = http.createServer(app);

    // Initialize Socket.IO
    const io = initializeSocket(httpServer);
    app.set('io', io);

    // Start server
    httpServer.listen(PORT, () => {
      logger.info(`
╔════════════════════════════════════════╗
║   🚀 Server Running Successfully       ║
╠════════════════════════════════════════╣
║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(20)}║
║   Port:        ${PORT.toString().padEnd(20)}║
║   URL:         http://localhost:${PORT.toString().padEnd(9)}║
╚════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    setupGracefulShutdown(httpServer);

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

const setupGracefulShutdown = (server) => {
  const gracefulShutdown = async (signal) => {
    logger.info(`\n⚠️  ${signal} received. Starting graceful shutdown...`);
    
    server.close(async () => {
      logger.info('🔌 HTTP server closed');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('⏰ Forcing shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error('❌ Unhandled Rejection:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
  });
  process.on('uncaughtException', (error) => {
    logger.error('❌ Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });
};