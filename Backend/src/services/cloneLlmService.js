/**
 * cloneLlmService.js - Express Client Adapter for Internal CloneLLM Service
 * Communicates with the Python microservice preserving all KIN intelligence.
 */
const axios = require('axios');
const config = require('../config/env');

const pythonClient = axios.create({
  baseURL: config.pythonServiceUrl,
  timeout: 30000,
});

/**
 * Checks health of the internal CloneLLM Python service
 */
async function checkHealth() {
  try {
    const res = await pythonClient.get('/internal/health', { timeout: 3000 });
    return res.data;
  } catch (err) {
    return {
      status: 'offline',
      error: err.message,
    };
  }
}

/**
 * Syncs a persistent persona from MongoDB into the CloneLLM service
 * @param {Object} personaData
 */
async function syncPersona(personaData) {
  try {
    const res = await pythonClient.post('/internal/persona/sync', {
      persona_id: personaData.slug || personaData.id,
      name: personaData.name,
      calling_name: personaData.callingName || null,
      relation: personaData.relation || 'Family Member',
      lifespan: personaData.lifespan || '',
      hometown: personaData.hometown || '',
      personality_summary: personaData.personalitySummary || '',
      catchphrases: personaData.catchphrases || [],
      memories: personaData.memories || [],
    });
    return res.data;
  } catch (err) {
    console.warn(`[CloneLLM Adapter Notice] Could not sync persona ${personaData.name} to Python service:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Sends a chat query and receives the full grounded response
 */
async function ask({ message, avatarId = 'dadaji' }) {
  try {
    const res = await pythonClient.post('/internal/chat', {
      message,
      avatar_id: avatarId,
    });
    return res.data;
  } catch (err) {
    console.error('[CloneLLM Adapter Error] ask failed:', err.response?.data || err.message);
    throw new Error(err.response?.data?.detail || err.message || 'CloneLLM inference failed.');
  }
}

/**
 * Streams tokens via SSE from the internal CloneLLM service
 */
async function streamChat({ message, avatarId = 'dadaji', onToken, onDone, onError }) {
  try {
    const response = await axios({
      method: 'POST',
      url: `${config.pythonServiceUrl}/internal/chat/stream`,
      data: {
        message,
        avatar_id: avatarId,
      },
      responseType: 'stream',
      timeout: 45000,
    });

    let buffer = '';
    response.data.on('data', (chunk) => {
      buffer += chunk.toString('utf-8');
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim() || !line.startsWith('data: ')) continue;
        try {
          const payload = JSON.parse(line.slice(6));
          if (payload.token) {
            onToken(payload.token);
          } else if (payload.done) {
            onDone(payload);
          } else if (payload.error) {
            onError(new Error(payload.error));
          }
        } catch (parseErr) {
          // ignore stream parse glitches
        }
      }
    });

    response.data.on('end', () => {
      onDone({ done: true });
    });

    response.data.on('error', (err) => {
      onError(err);
    });
  } catch (err) {
    console.error('[CloneLLM Adapter Error] streamChat failed:', err.message);
    onError(err);
  }
}

/**
 * Resets conversation history in CloneLLM
 */
async function resetMemory(avatarId = 'dadaji') {
  try {
    const res = await pythonClient.post('/internal/memory/reset', null, {
      params: { avatar_id: avatarId },
    });
    return res.data;
  } catch (err) {
    console.warn('[CloneLLM Adapter Warning] resetMemory failed:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  checkHealth,
  syncPersona,
  ask,
  streamChat,
  resetMemory,
};
