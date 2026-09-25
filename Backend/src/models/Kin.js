/**
 * Kin.js - Persistent KIN Persona Schema
 * Stores persona biographical context, voice/avatar IDs, and personality attributes.
 */
const mongoose = require('mongoose');

const kinSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null for system default personas like Dadaji
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    callingName: {
      type: String,
      trim: true,
    },
    relation: {
      type: String,
      default: 'Family Member',
      trim: true,
    },
    lifespan: {
      type: String,
      default: '',
      trim: true,
    },
    hometown: {
      type: String,
      default: '',
      trim: true,
    },
    personalitySummary: {
      type: String,
      default: '',
    },
    catchphrases: {
      type: [String],
      default: [],
    },
    photoUrl: {
      type: String,
      default: '/grandfather.jpg',
    },
    talkingVideoUrl: {
      type: String,
      default: null,
    },
    voiceId: {
      type: String,
      default: null, // ElevenLabs voice ID
    },
    avatarId: {
      type: String,
      default: null, // HeyGen avatar ID
    },
    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },
    voiceTrained: {
      type: Boolean,
      default: false,
    },
    faceRegistered: {
      type: Boolean,
      default: false,
    },
    personalityTraits: {
      warmth: { type: Number, default: 80 },
      humor: { type: Number, default: 70 },
      resilience: { type: Number, default: 85 },
      storytelling: { type: Number, default: 80 },
      calmness: { type: Number, default: 75 },
    },
    communicationSamples: [
      {
        context: String,
        audience_type: String,
        formality_level: Number,
        content: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

kinSchema.methods.toClientObject = function () {
  return {
    id: this.slug,
    _id: this._id.toString(),
    userId: this.userId ? this.userId.toString() : null,
    name: this.name,
    callingName: this.callingName || this.name.split(' ')[0],
    relation: this.relation,
    lifespan: this.lifespan,
    hometown: this.hometown,
    personalitySummary: this.personalitySummary,
    catchphrases: this.catchphrases,
    photoUrl: this.photoUrl,
    talkingVideoUrl: this.talkingVideoUrl,
    voiceId: this.voiceId,
    avatarId: this.avatarId,
    isDefault: this.isDefault,
    voiceTrained: this.voiceTrained,
    faceRegistered: this.faceRegistered,
    personalityTraits: this.personalityTraits,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('Kin', kinSchema);
