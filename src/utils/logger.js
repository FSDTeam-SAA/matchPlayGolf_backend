// ============================================
// FILE: src/utils/logger.js
// ============================================

const colors = {
  info: '\x1b[36m',
  error: '\x1b[31m',
  warn: '\x1b[33m',
  reset: '\x1b[0m',
};

export const logger = {
  info: (message, ...args) => {
    console.log(`${colors.info}[INFO]${colors.reset}`, message, ...args);
  },
  error: (message, ...args) => {
    console.error(`${colors.error}[ERROR]${colors.reset}`, message, ...args);
  },
  warn: (message, ...args) => {
    console.warn(`${colors.warn}[WARN]${colors.reset}`, message, ...args);
  },
};