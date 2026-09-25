/**
 * heygenService.js - Production HeyGen Interactive Streaming Avatar Service
 * Manages streaming WebRTC avatar sessions, speech tasks, and asynchronous video generation.
 */
const axios = require('axios');
const config = require('../config/env');

const HEYGEN_API_BASE = 'https://api.heygen.com/v1';

/**
 * Checks if HeyGen API key is configured
 */
function isConfigured() {
  return Boolean(config.heyGenApiKey && config.heyGenApiKey.trim());
}

/**
 * Creates an interactive real-time streaming avatar session
 * @param {Object} params
 * @param {string} [params.avatarId]
 * @param {string} [params.quality]
 * @returns {Promise<{ sessionId: string|null, token: string|null, url: string|null, fallback: boolean }>}
 */
async function createStreamingSession({
  avatarId = config.heyGenAvatarId,
  quality = 'medium',
} = {}) {
  if (!isConfigured()) {
    console.warn('[HeyGen Notice] HEYGEN_API_KEY is not configured in .env. Skipping HeyGen session creation.');
    return { sessionId: null, token: null, url: null, fallback: true };
  }

  try {
    // 1. Request Streaming Access Token
    const tokenRes = await axios.post(
      `${HEYGEN_API_BASE}/streaming.create_token`,
      {},
      {
        headers: {
          'x-api-key': config.heyGenApiKey,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    const token = tokenRes.data?.data?.token;

    // 2. Initialize Streaming Session
    const sessionRes = await axios.post(
      `${HEYGEN_API_BASE}/streaming.new`,
      {
        avatar_name: avatarId || config.heyGenAvatarId,
        quality,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    const sessionData = sessionRes.data?.data;
    return {
      sessionId: sessionData?.session_id || null,
      token,
      url: sessionData?.url || null,
      sdp: sessionData?.sdp || null,
      fallback: false,
    };
  } catch (err) {
    console.warn('[HeyGen Error] createStreamingSession failed:', err.response?.data || err.message);
    return { sessionId: null, token: null, url: null, fallback: true };
  }
}

/**
 * Dispatches a conversational speaking task to an active HeyGen streaming avatar
 * @param {Object} params
 * @param {string} params.sessionId
 * @param {string} params.text
 * @param {'talk'|'repeat'} [params.taskType]
 */
async function sendTask({ sessionId, text, taskType = 'talk' }) {
  if (!isConfigured() || !sessionId || !text) {
    return { success: false };
  }

  try {
    const res = await axios.post(
      `${HEYGEN_API_BASE}/streaming.task`,
      {
        session_id: sessionId,
        text,
        task_type: taskType,
      },
      {
        headers: {
          'x-api-key': config.heyGenApiKey,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    return {
      success: true,
      taskId: res.data?.data?.task_id || null,
    };
  } catch (err) {
    console.warn('[HeyGen Error] sendTask failed:', err.response?.data || err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Terminates an interactive avatar session cleanly
 * @param {Object} params
 * @param {string} params.sessionId
 */
async function stopSession({ sessionId }) {
  if (!isConfigured() || !sessionId) {
    return { success: true };
  }

  try {
    await axios.post(
      `${HEYGEN_API_BASE}/streaming.stop`,
      { session_id: sessionId },
      {
        headers: {
          'x-api-key': config.heyGenApiKey,
          'Content-Type': 'application/json',
        },
        timeout: 8000,
      }
    );
    return { success: true };
  } catch (err) {
    console.warn('[HeyGen Warning] stopSession notice:', err.message);
    return { success: false };
  }
}

/**
 * Renders an asynchronous MP4 video for static generation
 */
async function generateVideo({ avatarId = config.heyGenAvatarId, text }) {
  if (!isConfigured() || !text) {
    return { videoUrl: null, fallback: true };
  }

  try {
    const res = await axios.post(
      'https://api.heygen.com/v2/video/generate',
      {
        video_inputs: [
          {
            character: {
              type: 'avatar',
              avatar_id: avatarId,
            },
            voice: {
              type: 'text',
              input_text: text,
            },
          },
        ],
      },
      {
        headers: {
          'x-api-key': config.heyGenApiKey,
          'Content-Type': 'application/json',
        },
        timeout: 20000,
      }
    );

    return {
      videoId: res.data?.data?.video_id || null,
      fallback: false,
    };
  } catch (err) {
    console.warn('[HeyGen Error] generateVideo failed:', err.response?.data || err.message);
    return { videoUrl: null, fallback: true };
  }
}

module.exports = {
  isConfigured,
  createStreamingSession,
  sendTask,
  stopSession,
  generateVideo,
};
