/**
 * server.js - Production HTTP Server Lifecycle
 */
const app = require('./app');
const config = require('./config/env');
const { connectDatabase } = require('./config/database');

async function startServer() {
  console.log('----------------------------------------------------');
  console.log('🚀 Starting KIN AI Production Backend Server...');
  console.log(`🌍 Environment: ${config.nodeEnv}`);
  console.log(`🔌 Configured Port: ${config.port}`);
  console.log('----------------------------------------------------');

  // 1. Connect to MongoDB Atlas
  try {
    await connectDatabase();
  } catch (err) {
    console.warn('[Startup Notice] MongoDB connection error:', err.message);
  }

  // 2. Start Express HTTP Server
  const server = app.listen(config.port, () => {
    console.log(`✅ KIN AI Backend listening on http://localhost:${config.port}`);
    console.log(`📡 Health Check: http://localhost:${config.port}/api/health`);
    console.log(`📡 Status Check: http://localhost:${config.port}/api/status`);
  });

  // Graceful Shutdown
  const shutdown = (signal) => {
    console.log(`\n🛑 Received ${signal}. Shutting down KIN Backend gracefully...`);
    server.close(() => {
      console.log('👋 HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('❌ Fatal server startup error:', err);
  process.exit(1);
});
