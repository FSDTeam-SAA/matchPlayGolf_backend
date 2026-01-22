// src/modules/broadcast/broadcast.service.js
import { Subscribe, Brodcast } from "./broadcast.model.js";
import sendEmail from "../../lib/sendEmail.js";

/** Helper: build date range filter */
const buildDateFilter = (date) => {
  if (!date) return {};
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(`${date}T23:59:59.999Z`);
  return { createdAt: { $gte: start, $lte: end } };
};

/** Helper: build pagination object */
const buildPagination = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

/**
 * Create subscriber
 */
export const createSubscriberService = async ({ email }) => {
  if (!email) throw new Error("Email is required");

  const existing = await Subscribe.findOne({ email });
  if (existing) throw new Error("Email already subscribed");

  return await new Subscribe({ email }).save();
};

/**
 * Get all subscribers (with pagination + optional search/date)
 */
export const getAllSubscribersService = async ({
  search,
  date,
  page = 1,
  limit = 10,
  sort = "-createdAt",
}) => {
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.max(parseInt(limit, 10) || 10, 1);

  const filter = {
    ...(search
      ? { email: { $regex: search, $options: "i" } }
      : {}),
    ...buildDateFilter(date),
  };

  const total = await Subscribe.countDocuments(filter);

  const subscribers = await Subscribe.find(filter)
    .sort(sort)
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  const pagination = buildPagination(pageNum, limitNum, total);

  return { subscribers, pagination };
};

/**
 * Get subscriber
 */
export const getSubscriberByIdService = async (id) => {
  const subscriber = await Subscribe.findById(id);
  if (!subscriber) throw new Error("Subscriber not found");
  return subscriber;
};

/**
 * Delete subscriber
 */
export const deleteSubscriberService = async (id) => {
  const subscriber = await Subscribe.findById(id);
  if (!subscriber) throw new Error("Subscriber not found");

  await Subscribe.findByIdAndDelete(id);
  return;
};

/**
 * Send single broadcast email
 */
export const sendBroadcastService = async ({ email, subject, html }) => {
  if (!email || !subject || !html) {
    throw new Error("Email, subject, and html content are required");
  }

  await sendEmail({ to: email, subject, html });

  return await new Brodcast({ email, subject, html }).save();
};

/**
 * Send broadcast to all subscribers
 */
export const sendBroadcastToAllService = async ({ subject, html }) => {
  if (!subject || !html) throw new Error("Subject and html required");

  const subscribers = await Subscribe.find();
  if (!subscribers.length) throw new Error("No subscribers found");

  let results = { total: subscribers.length, sent: 0, failed: 0, errors: [] };

  for (const sub of subscribers) {
    try {
      await sendEmail({ to: sub.email, subject, html });
      await new Brodcast({ email: sub.email, subject, html }).save();
      results.sent++;
    } catch (e) {
      results.failed++;
      results.errors.push({ email: sub.email, error: e.message });
    }
  }

  return results;
};

/**
 * Get all broadcasts (with pagination + optional search/date)
 */
export const getAllBroadcastsService = async ({
  search,
  date,
  page = 1,
  limit = 10,
  sort = "-createdAt",
}) => {
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.max(parseInt(limit, 10) || 10, 1);

  const filter = {
    ...(search
      ? {
          $or: [
            { email: { $regex: search, $options: "i" } },
            { subject: { $regex: search, $options: "i" } },
          ],
        }
      : {}),
    ...buildDateFilter(date),
  };

  const total = await Brodcast.countDocuments(filter);

  const broadcasts = await Brodcast.find(filter)
    .sort(sort)
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  const pagination = buildPagination(pageNum, limitNum, total);

  return { broadcasts, pagination };
};

/**
 * Get broadcast by ID
 */
export const getBroadcastByIdService = async (id) => {
  const broadcast = await Brodcast.findById(id);
  if (!broadcast) throw new Error("Broadcast not found");
  return broadcast;
};

/**
 * Delete broadcast
 */
export const deleteBroadcastService = async (id) => {
  const broadcast = await Brodcast.findById(id);
  if (!broadcast) throw new Error("Broadcast not found");

  await Brodcast.findByIdAndDelete(id);
  return;
};
