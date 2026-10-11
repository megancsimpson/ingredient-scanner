const express = require('express');
const { register, login, me, deleteMe } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', requireAuth, me);
router.delete('/me', requireAuth, deleteMe);

module.exports = router;
