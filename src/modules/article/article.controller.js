// src/modules/article/article.controller.js
import mongoose from 'mongoose';
import {
  createArticleService,
  getArticlesService,
  getArticleByIdService,
  updateArticleService,
  deleteArticleService,
} from './article.service.js';

export const createArticle = async (req, res) => {
  try {
    const article = await createArticleService(req.user, req.body, req.file || null);

    return res.status(201).json({
      success: true,
      message: 'Article created successfully',
      data: article,
    });
  } catch (error) {
    if (error.code === 'VALIDATION_ERROR') {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error('Create article error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getArticles = async (req, res) => {
  try {
    const { page, limit, type, search, status } = req.query;
    const result = await getArticlesService({ page, limit, type, search, status });

    return res.status(200).json({
      success: true,
      message: 'Articles fetched successfully',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    if (error.code === 'VALIDATION_ERROR') {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error('Get articles error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getArticleById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid article id' });
    }

    const article = await getArticleByIdService(id);

    if (!article) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Article fetched successfully',
      data: article,
    });
  } catch (error) {
    console.error('Get article error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateArticle = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid article id' });
    }

    const result = await updateArticleService(id, req.user, req.body, req.file || null);

    if (result?.notFound) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    if (result?.forbidden) {
      return res.status(403).json({ success: false, message: 'Not allowed to update this article' });
    }

    return res.status(200).json({
      success: true,
      message: 'Article updated successfully',
      data: result.article,
    });
  } catch (error) {
    if (error.code === 'VALIDATION_ERROR') {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error('Update article error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid article id' });
    }

    const result = await deleteArticleService(id, req.user);

    if (result?.notFound) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    if (result?.forbidden) {
      return res.status(403).json({ success: false, message: 'Not allowed to delete this article' });
    }

    return res.status(200).json({ success: true, message: 'Article deleted successfully' });
  } catch (error) {
    console.error('Delete article error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
