/**
 * Feedback.js - Qualitative Post-Conversation Feedback Schema
 */
const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      default: 'guest',
      index: true,
    },
    avatarId: {
      type: String,
      default: 'general',
      index: true,
    },
    kinFeeling: {
      type: String,
      enum: ['felt_like_me', 'pretty_close', 'not_quite', 'didnt_feel_like_me'],
      required: true,
    },
    improvements: {
      type: String,
      default: '',
    },
    talkAgain: {
      type: String,
      enum: ['Yes', 'Maybe', 'No'],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

feedbackSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
