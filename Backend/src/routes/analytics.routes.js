/**
 * analytics.routes.js - Analytics Event Routes
 */
const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { optionalAuth, requireAuth, requireAdmin } = require('../middleware/auth');

router.post('/events', optionalAuth, analyticsController.trackEvent);
router.get('/events', requireAuth, requireAdmin, analyticsController.getEvents);

module.exports = router;
