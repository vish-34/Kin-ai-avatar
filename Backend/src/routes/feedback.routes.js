/**
 * feedback.routes.js - User Feedback Routes
 */
const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedback.controller');
const { optionalAuth, requireAuth, requireAdmin } = require('../middleware/auth');

router.post('/', optionalAuth, feedbackController.submitFeedback);
router.get('/', requireAuth, requireAdmin, feedbackController.getAllFeedback);

module.exports = router;
