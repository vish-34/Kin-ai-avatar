/**
 * Message.js - Individual Dialogue Turn Record
 * Stores short-term message exchanges with citations and media links.
 */
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    kinId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Kin',
      required: true,
      index: true,
    },
    sender: {
      type: String,
      enum: ['user', 'avatar'],
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    citation: {
      type: String,
      default: null,
    },
    audioUrl: {
      type: String,
      default: null,
    },
    videoUrl: {
      type: String,
      default: null,
    },
    turnIndex: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ conversationId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
