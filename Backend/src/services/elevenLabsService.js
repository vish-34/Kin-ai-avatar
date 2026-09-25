/**
 * elevenLabsService.js - Production Voice Cloning & Speech Synthesis Service
 * Connects KIN conversation pipeline to ElevenLabs API.
 */
const axios = require('axios');
const FormData = require('form-data');
const config = require('../config/env');

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';

/**
 * Checks if ElevenLabs API key is configured
 */
function isConfigured() {
  return Boolean(config.elevenLabsApiKey && config.elevenLabsApiKey.trim());
}

/**
 * Generates synthesized speech audio for a text clause or full response
 * @param {Object} params
 * @param {string} params.text
 * @param {string} [params.voiceId]
 * @param {string} [params.modelId]
 * @returns {Promise<{ audioBase64: string|null, audioBuffer: Buffer|null, fallback: boolean }>}
 */
async function generateSpeech({
  text,
  voiceId = config.elevenLabsVoiceId,
  modelId = 'eleven_turbo_v2_5',
}) {
  const trimmedText = (text || '').trim();
  if (!trimmedText) {
    return { audioBase64: null, audioBuffer: null, fallback: false };
  }

  if (!isConfigured()) {
    console.warn('[ElevenLabs Notice] ELEVENLABS_API_KEY is not configured in .env. Skipping voice synthesis.');
    return { audioBase64: null, audioBuffer: null, fallback: true };
  }

  try {
    const targetVoice = voiceId || config.elevenLabsVoiceId;
    const response = await axios.post(
      `${ELEVENLABS_API_BASE}/text-to-speech/${targetVoice}`,
      {
        text: trimmedText,
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.0,
          use_speaker_boost: true,
        },
      },
      {
        headers: {
          'xi-api-key': config.elevenLabsApiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        responseType: 'arraybuffer',
        timeout: 15000,
      }
    );

    const audioBuffer = Buffer.from(response.data);
    const audioBase64 = audioBuffer.toString('base64');

    return {
      audioBase64,
      audioBuffer,
      fallback: false,
    };
  } catch (err) {
    console.warn('[ElevenLabs Error] generateSpeech failed:', err.response?.data?.toString() || err.message);
    return { audioBase64: null, audioBuffer: null, fallback: true };
  }
}

/**
 * Clones a user's voice instantly using ElevenLabs Voice Add API
 * @param {Object} params
 * @param {string} params.name
 * @param {Buffer} params.audioBuffer
 * @param {string} [params.originalFilename]
 * @param {string} [params.description]
 * @returns {Promise<{ voiceId: string|null, success: boolean }>}
 */
async function cloneVoice({
  name,
  audioBuffer,
  originalFilename = 'sample.wav',
  description = 'KIN Cloned Voice Profile',
}) {
  if (!isConfigured() || !audioBuffer || audioBuffer.length < 500) {
    return { voiceId: null, success: false };
  }

  try {
    const form = new FormData();
    form.append('name', name);
    form.append('description', description);
    form.append('files', audioBuffer, {
      filename: originalFilename,
      contentType: 'audio/wav',
    });

    const response = await axios.post(`${ELEVENLABS_API_BASE}/voices/add`, form, {
      headers: {
        'xi-api-key': config.elevenLabsApiKey,
        ...form.getHeaders(),
      },
      timeout: 30000,
    });

    const voiceId = response.data?.voice_id || null;
    return {
      voiceId,
      success: Boolean(voiceId),
    };
  } catch (err) {
    console.warn('[ElevenLabs Error] cloneVoice failed:', err.response?.data?.toString() || err.message);
    return { voiceId: null, success: false };
  }
}

/**
 * Retrieves details for a specific voice
 */
async function getVoice(voiceId = config.elevenLabsVoiceId) {
  if (!isConfigured()) return null;
  try {
    const response = await axios.get(`${ELEVENLABS_API_BASE}/voices/${voiceId}`, {
      headers: { 'xi-api-key': config.elevenLabsApiKey },
      timeout: 5000,
    });
    return response.data;
  } catch (err) {
    return null;
  }
}

module.exports = {
  isConfigured,
  generateSpeech,
  cloneVoice,
  getVoice,
};
