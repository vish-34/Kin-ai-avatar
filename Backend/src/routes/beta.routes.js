/**
 * beta.routes.js - Beta Cohort Routes
 */
const express = require('express');
const router = express.Router();
const betaController = require('../controllers/beta.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.post('/applications', betaController.submitApplication);
router.get('/applications', requireAuth, requireAdmin, betaController.getApplications);
router.patch('/applications/:id', requireAuth, requireAdmin, betaController.updateApplicationStatus);

module.exports = router;
