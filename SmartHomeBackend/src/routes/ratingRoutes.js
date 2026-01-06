const router = require('express').Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const ctrl = require('../controllers/ratingController');

router.post('/', auth, roles('USER'), ctrl.create);
router.get('/provider/:providerId', ctrl.listForProvider);

module.exports = router;
