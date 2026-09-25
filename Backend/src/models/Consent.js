/**
 * Consent.js - Persistent User Consent Agreement
 * Enforces KIN-BETA-1.0 informed consent before any KIN creation.
 */
const mongoose = require('mongoose');

const consentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    consentVersion: {
      type: String,
      default: 'KIN-BETA-1.0',
      required: true,
    },
    consentGiven: {
      type: Boolean,
      default: true,
      required: true,
    },
    consentedAt: {
      type: Date,
      default: Date.now,
    },
    checkboxesConfirmed: {
      type: Number,
      default: 0,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// One active consent record per user per version
consentSchema.index({ userId: 1, consentVersion: 1 }, { unique: true });

module.exports = mongoose.model('Consent', consentSchema);
