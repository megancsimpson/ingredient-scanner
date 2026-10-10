const express = require('express');
const { analyze } = require('../controllers/analyzeController');

const router = express.Router();

// TODO: protect with the auth middleware once login is built
// (see docs/ARCHITECTURE.md, section 7.2)
router.post('/', analyze);

module.exports = router;
