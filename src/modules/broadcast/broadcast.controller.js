// src/modules/broadcast/broadcast.controller.js
import { generateResponse } from "../../middleware/responseFormate.js";
import mongoose from "mongoose";

import {
  createSubscriberService,
  getAllSubscribersService,
  getSubscriberByIdService,
  deleteSubscriberService,
  sendBroadcastService,
  sendBroadcastToAllService,
  getAllBroadcastsService,
  getBroadcastByIdService,
  deleteBroadcastService,
} from "./broadcast.service.js";

// ============= SUBSCRIBER CONTROLLERS =============

/**
 * @desc    Create a new subscriber
 * @route   POST /api/v1/broadcast/subscribe
 * @access  Public
 */
export const createSubscriber = async (req, res, next) => {
  const { email } = req.body;

  try {
    const subscriber = await createSubscriberService({ email });

    generateResponse(res, 201, true, "Subscribed successfully", subscriber);
  } catch (error) {
    if (
      error.message === "Email is required" ||
      error.message === "Email already subscribed"
    ) {
      generateResponse(res, 400, false, error.message, null);
    } else {
      next(error);
    }
  }
};

/**
 * @desc    Get all subscribers with pagination and filters
 * @route   GET /api/v1/broadcast/subscribe
 * @access  Private (Admin)
 */
export const getAllSubscribers = async (req, res, next) => {
  try {
    const { search, date, page = 1, limit = 10, sort = "-createdAt" } =
      req.query;

    const { subscribers, pagination } = await getAllSubscribersService({
      search,
      date,
      page,
      limit,
      sort,
    });

    generateResponse(res, 200, true, "Subscribers retrieved successfully", {
      subscribers,
      pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single subscriber by ID
 * @route   GET /api/v1/broadcast/subscribe/:id
 * @access  Private (Admin)
 */
export const getSubscriberById = async (req, res, next) => {
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return generateResponse(res, 400, false, "Invalid subscriber ID", null);
    }

    const subscriber = await getSubscriberByIdService(id);

    generateResponse(
      res,
      200,
      true,
      "Subscriber retrieved successfully",
      subscriber
    );
  } catch (error) {
    if (error.message === "Subscriber not found") {
      return generateResponse(res, 404, false, error.message, null);
    }
    next(error);
  }
};

/**
 * @desc    Delete a subscriber
 * @route   DELETE /api/v1/broadcast/subscribe/:id
 * @access  Private (Admin)
 */
export const deleteSubscriber = async (req, res, next) => {
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return generateResponse(res, 400, false, "Invalid subscriber ID", null);
    }

    await deleteSubscriberService(id);

    generateResponse(
      res,
      200,
      true,
      "Subscriber deleted successfully",
      null
    );
  } catch (error) {
    if (error.message === "Subscriber not found") {
      return generateResponse(res, 404, false, error.message, null);
    }
    next(error);
  }
};

// ============= BROADCAST CONTROLLERS =============

/**
 * @desc    Send broadcast email to specific email
 * @route   POST /api/v1/broadcast/specific
 * @access  Private (Admin)
 */
export const sendBroadcast = async (req, res, next) => {
  const { email, subject, html } = req.body;

  try {
    const broadcast = await sendBroadcastService({ email, subject, html });

    generateResponse(
      res,
      201,
      true,
      "Broadcast sent successfully",
      broadcast
    );
  } catch (error) {
    if (error.message.includes("are required")) {
      generateResponse(res, 400, false, error.message, null);
    } else if (error.message.includes("Failed to send")) {
      generateResponse(res, 500, false, error.message, null);
    } else {
      next(error);
    }
  }
};

/**
 * @desc    Send broadcast email to all subscribers
 * @route   POST /api/v1/broadcast
 * @access  Private (Admin)
 */
export const sendBroadcastToAll = async (req, res, next) => {
  const { subject, html } = req.body;

  try {
    const results = await sendBroadcastToAllService({ subject, html });

    generateResponse(
      res,
      200,
      true,
      "Broadcast sent to all subscribers",
      results
    );
  } catch (error) {
    if (
      error.message.includes("are required") ||
      error.message === "No subscribers found"
    ) {
      generateResponse(res, 400, false, error.message, null);
    } else {
      next(error);
    }
  }
};

/**
 * @desc    Get all broadcasts with pagination
 * @route   GET /api/v1/broadcast
 * @access  Private (Admin)
 */
export const getAllBroadcasts = async (req, res, next) => {
  try {
    const { search, date, page = 1, limit = 10, sort = "-createdAt" } =
      req.query;

    const { broadcasts, pagination } = await getAllBroadcastsService({
      search,
      date,
      page,
      limit,
      sort,
    });

    generateResponse(res, 200, true, "Broadcasts retrieved successfully", {
      broadcasts,
      pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single broadcast by ID
 * @route   GET /api/v1/broadcast/:id
 * @access  Private (Admin)
 */
export const getBroadcastById = async (req, res, next) => {
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return generateResponse(res, 400, false, "Invalid broadcast ID", null);
    }

    const broadcast = await getBroadcastByIdService(id);

    generateResponse(
      res,
      200,
      true,
      "Broadcast retrieved successfully",
      broadcast
    );
  } catch (error) {
    if (error.message === "Broadcast not found") {
      return generateResponse(res, 404, false, error.message, null);
    }
    next(error);
  }
};

/**
 * @desc    Delete a broadcast
 * @route   DELETE /api/v1/broadcast/:id
 * @access  Private (Admin)
 */
export const deleteBroadcast = async (req, res, next) => {
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return generateResponse(res, 400, false, "Invalid broadcast ID", null);
    }

    await deleteBroadcastService(id);

    generateResponse(
      res,
      200,
      true,
      "Broadcast deleted successfully",
      null
    );
  } catch (error) {
    if (error.message === "Broadcast not found") {
      return generateResponse(res, 404, false, error.message, null);
    }
    next(error);
  }
};
