/**
 * app.js - Express Application Entry & Middleware Pipeline
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const config = require('./config/env');
const errorHandler = require('./middleware/errorHandler');
const { getDatabaseStatus } = require('./config/database');
const { UPLOADS_DIR } = require('./config/storage');

const app = express();

// Security Headers (Configured to allow audio/video playback from static routes)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS Policy
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (
        config.corsOrigins.includes('*') ||
        config.corsOrigins.includes(origin) ||
        !config.isProduction
      ) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS.`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Structured Request Logging
if (!config.isProduction) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body Parsers
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static Media Serving (/uploads)
app.use('/uploads', express.static(UPLOADS_DIR));

// Static Fallback for Dadaji Baseline Assets if Frontend assets are referenced
const frontendPublicDir = path.resolve(__dirname, '../../Frontend/public');
app.use(express.static(frontendPublicDir));

// =====================================================================
// HEALTH & DIAGNOSTIC ENDPOINTS
// =====================================================================
app.get('/api/health', (req, res) => {
  const dbStatus = getDatabaseStatus();
  res.json({
    status: 'ok',
    service: 'kin-backend',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    database: dbStatus,
  });
});

// Load Routes
const authRoutes = require('./routes/auth.routes');
const betaRoutes = require('./routes/beta.routes');
const consentRoutes = require('./routes/consent.routes');
const kinRoutes = require('./routes/kin.routes');
const conversationRoutes = require('./routes/conversation.routes');
const feedbackRoutes = require('./routes/feedback.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const sttRoutes = require('./routes/stt.routes');

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/beta', betaRoutes);
app.use('/api/consent', consentRoutes);
app.use('/api/kins', kinRoutes);
app.use('/api/avatar', kinRoutes); // Backward-compatible route for frontend
app.use('/api/personas', kinRoutes); // Backward-compatible route for fetchPersonas()
app.use('/api/conversation', conversationRoutes);
app.use('/api/chat', conversationRoutes); // Backward-compatible route for streamChat()
app.use('/api/feedback', feedbackRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/stt', sttRoutes);

// Direct compatibility routes for frontend api.js
const conversationController = require('./controllers/conversation.controller');
app.post('/api/config/colab', conversationController.updateColabConfig);
app.post('/api/memory/reset', conversationController.resetMemory);

// Frontend Backend Status Compatibility Endpoint (/api/status)
app.get('/api/status', async (req, res) => {
  const dbStatus = getDatabaseStatus();
  res.json({
    status: 'online',
    service: 'kin-backend',
    persona: {
      name: 'Dadaji',
      full_name: 'Ramesh Vance Sharma',
      model: 'Groq GPT-OSS',
      ready: true,
    },
    colab: {
      connected: true,
      url: 'production-cloud',
      gpu_name: 'ElevenLabs & HeyGen Cloud Pipeline',
      cached_prompts: ['default', 'dadaji'],
      cached_avatars: ['default', 'dadaji'],
    },
    database: dbStatus,
  });
});

// Catch-all 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `The endpoint ${req.method} ${req.originalUrl} does not exist.`,
    },
  });
});

// Centralized Error Handler
app.use(errorHandler);

module.exports = app;
