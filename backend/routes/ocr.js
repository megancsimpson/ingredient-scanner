const express = require('express');
const { ocr } = require('../controllers/ocrController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Photos are much bigger than the other requests, so this route reads JSON
// bodies up to 8 MB (index.js mounts it before the app-wide 100 KB limit).
// The login check comes first, so only logged-in users can send large bodies.
router.post('/', requireAuth, express.json({ limit: '8mb' }), ocr);

module.exports = router;
