/**
 * consent.routes.js - Informed Consent Routes
 */
const express = require('express');
const router = express.Router();
const consentController = require('../controllers/consent.controller');
const { optionalAuth } = require('../middleware/auth');

router.post('/', optionalAuth, consentController.recordConsent);
router.get('/:userId', consentController.getConsentStatus);

module.exports = router;
