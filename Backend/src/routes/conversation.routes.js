/**
 * conversation.routes.js - Conversation & Real-Time Dialogue Routes
 */
const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversation.controller');
const { optionalAuth } = require('../middleware/auth');

// Streaming chat endpoint (SSE)
router.post('/stream', optionalAuth, conversationController.streamChat);

// Memory reset
router.post('/reset', conversationController.resetMemory);

// Backward compatibility with Frontend colab config modal
router.post('/config/colab', conversationController.updateColabConfig);

// HeyGen streaming session initiation
router.post('/heygen-session', optionalAuth, conversationController.createHeyGenSession);

module.exports = router;
