/**
 * auth.routes.js - User Authentication Routes
 */
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth');

router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/me', requireAuth, authController.getCurrentUser);
router.post('/logout', authController.logout);

module.exports = router;
