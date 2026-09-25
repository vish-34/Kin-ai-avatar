/**
 * env.js - Centralized Environment Configuration & Validation
 */
const path = require('path');
const dotenv = require('dotenv');

// Load .env from Backend root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5000,http://127.0.0.1:5000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kin_ai',

  jwtSecret: process.env.JWT_SECRET || 'kin_default_jwt_secret_change_in_production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  pythonServiceUrl: (process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:5001').replace(/\/+$/, ''),

  groqApiKey: process.env.GROQ_API_KEY || '',
  openRouterApiKey: process.env.OPENROUTER_API_KEY || '',

  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY || '',
  elevenLabsVoiceId: process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM',

  heyGenApiKey: process.env.HEYGEN_API_KEY || '',
  heyGenAvatarId: process.env.HEYGEN_AVATAR_ID || 'default',

  storageDriver: process.env.STORAGE_DRIVER || 'local',
  storageDir: path.resolve(__dirname, '../../uploads'),
  uploadMaxSizeMb: parseInt(process.env.UPLOAD_MAX_SIZE_MB || '50', 10),
};

module.exports = config;
