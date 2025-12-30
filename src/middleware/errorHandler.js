// import { logger } from '../utils/logger.js';

// export const errorHandler = (err, req, res, next) => {
//   logger.error('Error:', err);

//   const statusCode = err.statusCode || 500;
  
//   res.status(statusCode).json({
//     status: 'error',
//     statusCode,
//     message: err.message || 'Internal Server Error',
//   });
// };
class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export default AppError;
