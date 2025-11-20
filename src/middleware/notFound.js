
// ============================================
// FILE: src/middleware/notFound.js
// ============================================

export const notFound = (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
  });
};