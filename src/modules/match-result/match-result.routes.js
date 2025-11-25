// src/modules/match/match.routes.js
import express from 'express';
import {
  createMatch,
  getMatches,
  getMatchById,
  updateMatch,
  deleteMatch,
} from './match-result.controller.js';
import { verifyToken } from '../../middleware/authMiddleware.js';
import { multerUpload } from '../../config/multer.js';

const router = express.Router();

// Create match result (with optional photo)
// POST /api/match
router.post(
  '/',
  verifyToken,
  multerUpload.single('photo'), 
  createMatch
);

// Get all matches for logged-in user
// GET /api/match
router.get('/', verifyToken, getMatches);

// Get single match by id
// GET /api/match/:id
router.get('/:id', verifyToken, getMatchById);

// Update match (fields + optional new photo)
// PUT /api/match/:id
router.put(
  '/:id',
  verifyToken,
  multerUpload.single('photo'), // optional
  updateMatch
);

// Delete match
// DELETE /api/match/:id
router.delete('/:id', verifyToken, deleteMatch);

export default router;