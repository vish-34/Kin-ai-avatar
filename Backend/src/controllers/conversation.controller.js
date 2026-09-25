/**
 * conversation.controller.js - Real-Time Streaming Dialogue Orchestrator
 * Pipeline: User Message -> CloneLLM -> ElevenLabs TTS -> HeyGen Avatar -> Frontend SSE
 */
const Kin = require('../models/Kin');
const cloneLlmService = require('../services/cloneLlmService');
const elevenLabsService = require('../services/elevenLabsService');
const heygenService = require('../services/heygenService');
const conversationService = require('../services/conversationService');

/**
 * Splits text into natural sentence / clause chunks for early audio synthesis
 */
function splitIntoClauses(text) {
  const pattern = /([.!?;:\n]+)/;
  const tokens = text.split(pattern);
  const clauses = [];
  for (let i = 0; i < tokens.length - 1; i += 2) {
    const chunk = tokens[i].trim();
    const punct = tokens[i + 1] ? tokens[i + 1].trim() : '';
    if (chunk) {
      clauses.push(`${chunk}${punct}`);
    }
  }
  if (tokens.length % 2 === 1 && tokens[tokens.length - 1].trim()) {
    clauses.push(tokens[tokens.length - 1].trim());
  }
  return clauses.filter((c) => c.trim());
}

/**
 * POST /api/chat/stream
 * Handles SSE streaming matching the exact Frontend contract in api.js streamChat()
 */
async function streamChat(req, res, next) {
  const {
    message,
    avatar_id = 'dadaji',
    speaker_name = 'default',
    stream_media = true,
    generate_video = false,
    session_id = null,
  } = req.body;

  const prompt = (message || '').trim();
  if (!prompt) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'Message cannot be empty.' },
    });
  }

  // 1. Resolve Kin and voice configuration
  let kin = null;
  try {
    kin = await Kin.findOne({ slug: avatar_id.toLowerCase().trim() });
  } catch (e) {}

  const targetVoiceId = kin?.voiceId || null;
  const targetAvatarId = kin?.avatarId || avatar_id;
  const userId = req.user ? (req.user._id || req.user.id) : null;

  // 2. Set up SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  let fullResponseText = '';
  let clauseBuffer = '';
  let clauseIndex = 0;
  const sentenceDelimiters = /([.!?;:\n]+)/;
  const audioPromises = [];

  // Helper to send SSE event
  const sendSSE = (event, data) => {
    if (!res.writableEnded) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }
  };

  try {
    // 3. Stream tokens from internal CloneLLM service
    await cloneLlmService.streamChat({
      message: prompt,
      avatarId: avatar_id,
      onToken: async (token) => {
        fullResponseText += token;
        clauseBuffer += token;

        // Emit text token immediately for sub-second subtitle rendering
        sendSSE('text_chunk', { token });

        // Check if buffer contains a complete sentence/clause
        const parts = clauseBuffer.split(sentenceDelimiters);
        if (parts.length > 2) {
          const candidateClause = (parts[0] + parts[1]).trim();
          // Avoid choppy fragments under 18 chars or fewer than 3 words unless terminal
          if (candidateClause.length >= 18 || candidateClause.split(/\s+/).length >= 3) {
            clauseBuffer = parts.slice(2).join('');

            if (candidateClause && stream_media) {
              const currentIdx = clauseIndex++;
              // Synthesize voice via ElevenLabs
              const audioPromise = elevenLabsService
                .generateSpeech({
                  text: candidateClause,
                  voiceId: targetVoiceId,
                })
                .then((audioPayload) => {
                  sendSSE('media_chunk', {
                    chunk_index: currentIdx,
                    text: candidateClause,
                    audio_base64: audioPayload.audioBase64,
                    fallback: audioPayload.fallback,
                  });
                })
                .catch((e) => {
                  console.warn('[ElevenLabs Clause Error]', e.message);
                });

              audioPromises.push(audioPromise);
            }
          }
        }
      },
      onDone: async () => {
        // Flush any remaining text in clauseBuffer
        const remainingClause = clauseBuffer.trim();
        if (remainingClause && stream_media) {
          const currentIdx = clauseIndex++;
          const audioPromise = elevenLabsService
            .generateSpeech({
              text: remainingClause,
              voiceId: targetVoiceId,
            })
            .then((audioPayload) => {
              sendSSE('media_chunk', {
                chunk_index: currentIdx,
                text: remainingClause,
                audio_base64: audioPayload.audioBase64,
                fallback: audioPayload.fallback,
              });
            })
            .catch(() => {});

          audioPromises.push(audioPromise);
        }

        // Wait for all audio synthesis to finish dispatching
        await Promise.all(audioPromises);

        // If HeyGen streaming session active, dispatch task
        if (generate_video && session_id && heygenService.isConfigured()) {
          heygenService.sendTask({ sessionId: session_id, text: fullResponseText }).catch(() => {});
        }

        // Persist dialogue turn in MongoDB
        if (kin && kin._id) {
          const mode = generate_video ? 'video' : stream_media ? 'voice' : 'chat';
          const conv = await conversationService.getOrCreateConversation({
            kinId: kin._id,
            userId,
            mode,
          });

          if (conv) {
            await conversationService.recordTurn({
              conversationId: conv._id,
              kinId: kin._id,
              userText: prompt,
              avatarText: fullResponseText,
              citation: 'Synthesized from authentic voice profile & personal memories',
            });
          }
        }

        // Final completion event
        const citation = 'Synthesized from authentic voice profile & personal memories';
        sendSSE('done', {
          full_text: fullResponseText,
          citation,
        });

        res.end();
      },
      onError: (err) => {
        sendSSE('error', { error: err.message || 'Stream error occurred.' });
        res.end();
      },
    });
  } catch (err) {
    sendSSE('error', { error: err.message });
    res.end();
  }
}

/**
 * POST /api/memory/reset
 */
async function resetMemory(req, res, next) {
  try {
    const avatarId = req.body?.avatar_id || 'dadaji';
    const result = await cloneLlmService.resetMemory(avatarId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/config/colab
 * Backward compatibility endpoint for Frontend
 */
function updateColabConfig(req, res) {
  res.json({
    status: 'success',
    url: 'production-cloud',
    colab_health: { status: 'healthy', gpu_name: 'ElevenLabs & HeyGen Cloud' },
  });
}

/**
 * POST /api/conversation/heygen-session
 * Creates an interactive HeyGen WebRTC streaming session for the frontend
 */
async function createHeyGenSession(req, res, next) {
  try {
    const { avatarId } = req.body;
    const session = await heygenService.createStreamingSession({ avatarId });
    res.json({
      success: true,
      session,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  streamChat,
  resetMemory,
  updateColabConfig,
  createHeyGenSession,
};
