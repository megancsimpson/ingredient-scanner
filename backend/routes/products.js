const express = require('express');
const { list, getOne, create, update, remove } = require('../controllers/productsController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Every products route needs a logged-in user
router.use(requireAuth);

router.get('/', list);
router.get('/:id', getOne);
router.post('/', create);
// PATCH (not PUT) because only some fields are sent and changed
router.patch('/:id', update);
router.delete('/:id', remove);

module.exports = router;
