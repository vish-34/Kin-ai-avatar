/**
 * feedback.controller.js - Qualitative Post-Conversation Feedback Management
 */
const Feedback = require('../models/Feedback');

/**
 * POST /api/feedback
 */
async function submitFeedback(req, res, next) {
  try {
    const { userId, avatarId, kinFeeling, improvements, talkAgain } = req.body;
    if (!kinFeeling || !talkAgain) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'kinFeeling and talkAgain are required fields.' },
      });
    }

    const feedback = await Feedback.create({
      userId: userId || (req.user ? req.user._id.toString() : 'guest'),
      avatarId: avatarId || 'general',
      kinFeeling,
      improvements: improvements?.trim() || '',
      talkAgain,
    });

    res.status(201).json({
      success: true,
      feedback,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/feedback (Admin)
 */
async function getAllFeedback(req, res, next) {
  try {
    const list = await Feedback.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      feedback: list,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  submitFeedback,
  getAllFeedback,
};
