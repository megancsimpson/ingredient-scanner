const express = require('express');
const { analyze } = require('../controllers/analyzeController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, analyze);

module.exports = router;
