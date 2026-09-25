/**
 * Memory.js - Long-Term Cognitive Memory Store
 * Stores grounded memories, stories, notes, and ingested document excerpts for RAG.
 */
const mongoose = require('mongoose');

const memorySchema = new mongoose.Schema(
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
    category: {
      type: String,
      enum: ['written_note', 'core_memory', 'document', 'chat_transcript', 'voice_transcript'],
      default: 'written_note',
      index: true,
    },
    title: {
      type: String,
      default: 'Memory',
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    sourceFileUrl: {
      type: String,
      default: null,
    },
    sourceFileName: {
      type: String,
      default: null,
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

// Compound index for querying a Kin's memories efficiently
memorySchema.index({ kinId: 1, createdAt: -1 });

module.exports = mongoose.model('Memory', memorySchema);
