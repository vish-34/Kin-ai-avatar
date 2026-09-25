/**
 * stt.controller.js - Ultra-Fast Speech-to-Text via Groq Whisper API
 */
const axios = require('axios');
const FormData = require('form-data');
const config = require('../config/env');

async function transcribeSpeech(req, res, next) {
  try {
    if (!req.file) {
      return res.json({ text: '', status: 'empty' });
    }

    const audioBuffer = req.file.buffer;
    if (!audioBuffer || audioBuffer.length < 200) {
      return res.json({ text: '', status: 'empty' });
    }

    const groqKey = config.groqApiKey || process.env.GroqAPIKey || process.env.GROQ_API_KEY;
    if (!groqKey) {
      return res.status(500).json({
        success: false,
        error: { code: 'GROQ_CONFIG_MISSING', message: 'Groq API key is not configured.' },
      });
    }

    const form = new FormData();
    const filename = req.file.originalname || 'speech.webm';
    form.append('file', audioBuffer, {
      filename,
      contentType: req.file.mimetype || 'audio/webm',
    });
    form.append('model', 'whisper-large-v3-turbo');
    form.append('language', 'en');
    form.append('prompt', 'Conversation with Indian grandfather Dadaji Ramesh Sharma.');

    const response = await axios.post('https://api.groq.com/openai/v1/audio/transcriptions', form, {
      headers: {
        Authorization: `Bearer ${groqKey}`,
        ...form.getHeaders(),
      },
      timeout: 10000,
    });

    const transcript = response.data?.text ? response.data.text.trim() : '';
    res.json({
      text: transcript,
      status: 'success',
    });
  } catch (err) {
    console.warn('[STT Controller Warning] Groq Whisper error:', err.response?.data || err.message);
    res.json({
      text: '',
      status: 'error',
      message: err.message,
    });
  }
}

module.exports = {
  transcribeSpeech,
};
