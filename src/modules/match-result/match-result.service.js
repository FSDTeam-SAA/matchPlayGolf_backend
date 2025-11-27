// src/modules/match/match.service.js
import Match from './match-result.model.js';
import { uploadToCloudinary } from '../../lib/uploadToCloudinary.js';

// Require non-empty strings for core fields
const isNonEmptyString = (value) =>
  typeof value === 'string' && value.trim().length > 0;

// Helper to safely parse numbers
const toNumberOrNull = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
};

// Helper to validate match result
const normalizeResult = (value) => {
  // default to win when not provided
  if (value === undefined || value === null || value === '') return 'win';
  if (typeof value !== 'string') return null;
  const lowered = value.trim().toLowerCase();
  if (['win', 'won'].includes(lowered)) return 'win';
  if (['lose', 'loss', 'lost'].includes(lowered)) return 'lose';
  return null;
};

// Helper to parse date from string (YYYY-MM-DD or any JS Date-parseable string)
const toDateOrNull = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

// ================= CREATE MATCH =================
export const createMatchService = async (userId, data, file) => {
  const {
    matchDate,
    matchTime,
    team1,
    team2,
    player1,
    player2,
    matchName,
    yourScore,
    opponentScore,
    matchResult,
    comments,
  } = data;

  // Validate required strings up front
  const requiredStrings = { team1, team2, player1, player2, matchName };
  for (const [key, val] of Object.entries(requiredStrings)) {
    if (!isNonEmptyString(val)) {
      const err = new Error(`${key} is required`);
      err.code = 'INVALID_FIELD';
      throw err;
    }
  }

  const parsedDate = toDateOrNull(matchDate);
  if (!parsedDate) {
    const err = new Error('Invalid or missing matchDate');
    err.code = 'INVALID_DATE';
    throw err;
  }

  const yourScoreNum = toNumberOrNull(yourScore);
  const opponentScoreNum = toNumberOrNull(opponentScore);

  if (yourScoreNum === null || opponentScoreNum === null) {
    const err = new Error('Invalid score values');
    err.code = 'INVALID_SCORE';
    throw err;
  }

  const normalizedResult = normalizeResult(matchResult);
  if (!normalizedResult) {
    const err = new Error('Invalid matchResult (use win or lose)');
    err.code = 'INVALID_RESULT';
    throw err;
  }

  let photoUrl = '';

  if (file && file.buffer) {
    const uploadResult = await uploadToCloudinary(
      file.buffer,
      file.originalname || 'match_photo',
      'match_photos'
    );
    if (uploadResult?.secure_url) {
      photoUrl = uploadResult.secure_url;
    }
  }

  const match = await Match.create({
    createdBy: userId,
    matchDate: parsedDate,
    matchTime: matchTime || '',
    team1,
    team2,
    player1,
    player2,
    matchName,
    yourScore: yourScoreNum,
    opponentScore: opponentScoreNum,
    matchResult: normalizedResult,
    comments: comments || '',
    photo: photoUrl,
  });

  return match;
};

// ================= GET ALL MATCHES FOR USER (with pagination) =================
export const getMatchesService = async (userId, { page = 1, limit = 10 }) => {
  const parsedPage = Number.parseInt(page, 10);
  const parsedLimit = Number.parseInt(limit, 10);

  const safePage = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  const safeLimit =
    Number.isNaN(parsedLimit) || parsedLimit < 1 ? 10 : parsedLimit;

  const filter = { createdBy: userId };

  const [total, matches] = await Promise.all([
    Match.countDocuments(filter),
    Match.find(filter)
      .sort({ matchDate: -1, createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit),
  ]);

  return {
    data: matches,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
};

// ================= GET SINGLE MATCH =================
export const getMatchByIdService = async (userId, matchId) => {
  const match = await Match.findOne({
    _id: matchId,
    createdBy: userId,
  });
  return match;
};

// ================= UPDATE MATCH =================
export const updateMatchService = async (userId, matchId, data, file) => {
  const match = await Match.findOne({
    _id: matchId,
    createdBy: userId,
  });

  if (!match) return null;

  const fields = [
    'matchDate',
    'matchTime',
    'team1',
    'team2',
    'player1',
    'player2',
    'matchName',
    'yourScore',
    'opponentScore',
    'matchResult',
    'comments',
  ];

  for (const field of fields) {
    if (data[field] !== undefined) {
      if (field === 'matchDate') {
        const parsedDate = toDateOrNull(data.matchDate);
        if (!parsedDate) {
          const err = new Error('Invalid matchDate');
          err.code = 'INVALID_DATE';
          throw err;
        }
        match.matchDate = parsedDate;
      } else if (field === 'yourScore' || field === 'opponentScore') {
        const num = toNumberOrNull(data[field]);
        if (num === null) {
          const err = new Error('Invalid score value');
          err.code = 'INVALID_SCORE';
          throw err;
        }
        match[field] = num;
      } else if (
        ['team1', 'team2', 'player1', 'player2', 'matchName'].includes(field)
      ) {
        if (!isNonEmptyString(data[field])) {
          const err = new Error(`${field} is required`);
          err.code = 'INVALID_FIELD';
          throw err;
        }
        match[field] = data[field];
      } else if (field === 'matchResult') {
        const normalized = normalizeResult(data[field]);
        if (!normalized) {
          const err = new Error('Invalid matchResult (use win or lose)');
          err.code = 'INVALID_RESULT';
          throw err;
        }
        match.matchResult = normalized;
      } else {
        match[field] = data[field];
      }
    }
  }

  // Optional replace photo
  if (file && file.buffer) {
    const uploadResult = await uploadToCloudinary(
      file.buffer,
      file.originalname || 'match_photo',
      'match_photos'
    );
    if (uploadResult?.secure_url) {
      match.photo = uploadResult.secure_url;
    }
  }

  await match.save();
  return match;
};

// ================= DELETE MATCH =================
export const deleteMatchService = async (userId, matchId) => {
  const result = await Match.deleteOne({
    _id: matchId,
    createdBy: userId,
  });
  return result.deletedCount > 0;
};
