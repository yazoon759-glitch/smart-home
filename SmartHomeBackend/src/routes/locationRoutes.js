const router = require('express').Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const ctrl = require('../controllers/locationController');

router.use(auth, roles('USER', 'PROVIDER', 'ADMIN', 'MANAGER'));
router.post('/', roles('USER'), ctrl.create);
router.get('/', roles('USER'), ctrl.listMine);
router.put('/:id', roles('USER'), ctrl.update);
router.delete('/:id', roles('USER'), ctrl.remove);
router.patch('/:id/default', roles('USER'), ctrl.setDefault);

module.exports = router;
