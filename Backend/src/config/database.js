/**
 * database.js - MongoDB Atlas Connection Management via Mongoose
 */
const dns = require('dns');
const mongoose = require('mongoose');
const config = require('./env');

// Fix for Windows / ISP DNS failing MongoDB SRV lookups (querySrv ECONNREFUSED)
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {
  // non-fatal if not permitted by environment
}

let isConnected = false;

async function connectDatabase() {
  if (isConnected) {
    return;
  }

  const options = {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 15000,
    dbName: 'kin_ai',
  };

  try {
    console.log(`[Database] Connecting to MongoDB: ${config.mongodbUri.replace(/:([^:@]+)@/, ':****@')}...`);
    const conn = await mongoose.connect(config.mongodbUri, options);
    isConnected = true;
    console.log(`[Database] Connected successfully to MongoDB host: ${conn.connection.host}, database: ${conn.connection.name}`);
  } catch (err) {
    console.error(`[Database Error] Could not connect to MongoDB: ${err.message}`);
    if (config.isProduction) {
      throw err;
    } else {
      console.warn('[Database Notice] Running in offline / unlinked mode. Ensure MONGODB_URI is provided in .env for Atlas persistence.');
    }
  }

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    console.warn('[Database] MongoDB connection lost. Retrying...');
  });

  mongoose.connection.on('reconnected', () => {
    isConnected = true;
    console.log('[Database] MongoDB reconnected.');
  });
}

function getDatabaseStatus() {
  return {
    connected: isConnected && mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null,
  };
}

module.exports = {
  connectDatabase,
  getDatabaseStatus,
};
