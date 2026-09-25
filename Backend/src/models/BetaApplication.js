/**
 * BetaApplication.js - Persistent Beta Cohort Application Schema
 */
const mongoose = require('mongoose');

const betaApplicationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
    },
    ageRange: {
      type: String,
      required: true,
    },
    profession: {
      type: String,
      default: 'Not specified',
      trim: true,
    },
    interestReason: {
      type: String,
      required: true,
    },
    preservationGoal: {
      type: String,
      default: 'Family living memory',
    },
    acquisitionSource: {
      type: String,
      required: true,
    },
    willingnessToTest: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'contacted'],
      default: 'pending',
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

betaApplicationSchema.index({ email: 1, createdAt: -1 });

module.exports = mongoose.model('BetaApplication', betaApplicationSchema);
