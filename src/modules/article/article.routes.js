// src/modules/article/article.routes.js
import express from 'express';
import {
  createArticle,
  getArticles,
  getArticleById,
  updateArticle,
  deleteArticle,
} from './article.controller.js';
import { verifyToken } from '../../middleware/authMiddleware.js';
import { multerUpload } from '../../config/multer.js';

const router = express.Router();

// Public fetch
router.get('/', getArticles);
router.get('/:id', getArticleById);

// Protected mutations
router.post('/', verifyToken, multerUpload.single('coverImage'), createArticle);
router.put('/:id', verifyToken, multerUpload.single('coverImage'), updateArticle);
router.delete('/:id', verifyToken, deleteArticle);

export default router;
