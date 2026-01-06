const router = require('express').Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const ctrl = require('../controllers/adminProviderController');

router.use(auth, roles('ADMIN'));

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
