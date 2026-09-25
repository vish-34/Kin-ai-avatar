/**
 * stt.routes.js - Speech-to-Text Routes
 */
const express = require('express');
const multer = require('multer');
const router = express.Router();
const sttController = require('../controllers/stt.controller');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
});

router.post('/', upload.single('file'), sttController.transcribeSpeech);

module.exports = router;
