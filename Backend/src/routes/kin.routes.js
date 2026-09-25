/**
 * kin.routes.js - Persona Management & Media Routes
 */
const express = require('express');
const multer = require('multer');
const router = express.Router();
const kinController = require('../controllers/kin.controller');
const { optionalAuth, requireAuth, requireBetaApproved, requireConsent } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max upload
});

const kinUploads = upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'voice', maxCount: 1 },
]);

// Creation routes (Protected by auth, beta approval, and consent)
router.post('/create', optionalAuth, kinUploads, kinController.createKin);
router.post('/', optionalAuth, kinUploads, kinController.createKin);

// Listing personas
router.get('/', optionalAuth, kinController.listPersonas);

// Media routes
router.get('/idle', kinController.getIdleMedia);
router.get('/video', kinController.getTalkingVideo);
router.get('/idle_video', kinController.getTalkingVideo);

// Deletion routes (Enforces authentication & ownership checks)
router.delete('/:avatar_id', optionalAuth, kinController.deleteKin);

module.exports = router;
