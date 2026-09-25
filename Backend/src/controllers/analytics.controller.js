/**
 * analytics.controller.js - Product Analytics Event Ingestion & Review
 */
const AnalyticsEvent = require('../models/AnalyticsEvent');

/**
 * POST /api/analytics/events
 */
async function trackEvent(req, res, next) {
  try {
    const { event, properties, path: eventPath, epoch } = req.body;
    if (!event) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Event name is required.' },
      });
    }

    const recorded = await AnalyticsEvent.create({
      event,
      properties: properties || {},
      userId: req.user ? req.user._id.toString() : 'anonymous',
      path: eventPath || '/',
      epoch: epoch || Date.now(),
    });

    res.status(201).json({
      success: true,
      id: recorded._id.toString(),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/analytics/events (Admin)
 */
async function getEvents(req, res, next) {
  try {
    const limit = parseInt(req.query.limit || '100', 10);
    const events = await AnalyticsEvent.find().sort({ createdAt: -1 }).limit(limit);
    res.json({
      success: true,
      events,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  trackEvent,
  getEvents,
};
