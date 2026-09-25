/**
 * Conversation.js - Interactive Session / Dialogue Session
 * Tracks short-term conversation lifecycle between a user and a KIN.
 */
const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    kinId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Kin',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    mode: {
      type: String,
      enum: ['chat', 'voice', 'video'],
      default: 'voice',
    },
    title: {
      type: String,
      default: 'Dialogue Session',
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    messageCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

conversationSchema.index({ userId: 1, lastActivityAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
