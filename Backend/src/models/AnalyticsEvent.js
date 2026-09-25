/**
 * AnalyticsEvent.js - Persistent Product Analytics Schema
 */
const mongoose = require('mongoose');

const analyticsEventSchema = new mongoose.Schema(
  {
    event: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      default: 'anonymous',
      index: true,
    },
    properties: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    path: {
      type: String,
      default: '/',
    },
    epoch: {
      type: Number,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

analyticsEventSchema.index({ event: 1, createdAt: -1 });

module.exports = mongoose.model('AnalyticsEvent', analyticsEventSchema);
