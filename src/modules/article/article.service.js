// src/modules/article/article.service.js
import Article from './article.model.js';
import { uploadToCloudinary } from '../../lib/uploadToCloudinary.js';

const isNonEmptyString = (val) => typeof val === 'string' && val.trim().length > 0;
const ARTICLE_STATUSES = ['draft', 'published'];

const normalizeStatus = (status) => {
  if (status === undefined) return undefined;
  if (!isNonEmptyString(status)) {
    const err = new Error('Status cannot be empty');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  const normalized = status.trim().toLowerCase();
  if (!ARTICLE_STATUSES.includes(normalized)) {
    const err = new Error('Invalid status. Use draft or published');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  return normalized;
};

const parsePagination = (page, limit) => {
  const safePage = Number.isFinite(Number(page)) && Number(page) > 0 ? Number(page) : 1;
  const safeLimit = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Number(limit) : 10;
  return { page: safePage, limit: safeLimit };
};

export const createArticleService = async (user, data, file) => {
  const { title, description, type, status } = data;

  if (!isNonEmptyString(title) || !isNonEmptyString(description) || !isNonEmptyString(type)) {
    const err = new Error('Title, description, and type are required');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  let coverImage = isNonEmptyString(data.coverImage) ? data.coverImage.trim() : '';

  if (file?.buffer) {
    const upload = await uploadToCloudinary(
      file.buffer,
      file.originalname || 'article_cover',
      'article_covers'
    );
    coverImage = upload?.secure_url || coverImage;
  }

  const articleData = {
    title: title.trim(),
    description: description.trim(),
    type: type.trim(),
    coverImage,
    createdBy: user._id,
  };

  const normalizedStatus = normalizeStatus(status);
  if (normalizedStatus) {
    articleData.status = normalizedStatus;
  }

  return Article.create(articleData);
};

export const getArticlesService = async ({ page = 1, limit = 10, type, search, status }) => {
  const { page: safePage, limit: safeLimit } = parsePagination(page, limit);

  const filter = {};

  if (isNonEmptyString(type)) {
    filter.type = { $regex: type.trim(), $options: 'i' };
  }

  const normalizedStatus = normalizeStatus(status);
  if (normalizedStatus) {
    filter.status = normalizedStatus;
  }

  if (isNonEmptyString(search)) {
    filter.$or = [
      { title: { $regex: search.trim(), $options: 'i' } },
      { description: { $regex: search.trim(), $options: 'i' } },
    ];
  }

  const [total, articles] = await Promise.all([
    Article.countDocuments(filter),
    Article.find(filter)
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .populate('createdBy', 'fullName profileImage role'),
  ]);

  return {
    data: articles,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
};

export const getArticleByIdService = async (articleId) => {
  return Article.findById(articleId).populate('createdBy', 'fullName profileImage role');
};

export const updateArticleService = async (articleId, user, data, file) => {
  const article = await Article.findById(articleId);
  if (!article) return { notFound: true };

  const isOwner = article.createdBy?.toString() === user?._id?.toString();
  const isAdmin = user?.role === 'Admin';
  if (!isOwner && !isAdmin) return { forbidden: true };

  if (data.title !== undefined) {
    if (!isNonEmptyString(data.title)) {
      const err = new Error('Title cannot be empty');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    article.title = data.title.trim();
  }

  if (data.description !== undefined) {
    if (!isNonEmptyString(data.description)) {
      const err = new Error('Description cannot be empty');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    article.description = data.description.trim();
  }

  if (data.type !== undefined) {
    if (!isNonEmptyString(data.type)) {
      const err = new Error('Type cannot be empty');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    article.type = data.type.trim();
  }

  if (data.coverImage !== undefined) {
    article.coverImage = data.coverImage || '';
  }

  if (file?.buffer) {
    const upload = await uploadToCloudinary(
      file.buffer,
      file.originalname || 'article_cover',
      'article_covers'
    );
    if (upload?.secure_url) {
      article.coverImage = upload.secure_url;
    }
  }

  if (data.status !== undefined) {
    const normalizedStatus = normalizeStatus(data.status);
    article.status = normalizedStatus;
  }

  await article.save();
  return { article };
};

export const deleteArticleService = async (articleId, user) => {
  const article = await Article.findById(articleId);
  if (!article) return { notFound: true };

  const isOwner = article.createdBy?.toString() === user?._id?.toString();
  const isAdmin = user?.role === 'Admin';
  if (!isOwner && !isAdmin) return { forbidden: true };

  await article.deleteOne();
  return { deleted: true };
};
