const express = require('express');
const { search, getOne } = require('../controllers/ingredientsController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', search);
router.get('/:id', getOne);

module.exports = router;
