import { Subscribe, Brodcast } from "./broadcast.model.js";
import sendEmail from "../../lib/sendEmail.js";

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
 * Get all subscribers (no pagination)
 */
export const getAllSubscribersService = async () => {
  return await Subscribe.find().sort("-createdAt");
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
 * Get all broadcasts (no pagination)
 */
export const getAllBroadcastsService = async () => {
  return await Brodcast.find().sort("-createdAt");
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
