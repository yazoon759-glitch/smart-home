const router = require('express').Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const ctrl = require('../controllers/requestController');

router.post('/', auth, roles('USER'), ctrl.create);
router.get('/my', auth, roles('USER'), ctrl.listMine);
router.get('/my/pending-approvals', auth, roles('USER'), ctrl.listPendingApprovals);
router.patch('/:id/accept', auth, roles('USER'), ctrl.acceptPayment);
router.patch('/:id/status', auth, roles('USER'), ctrl.updateStatus);
router.patch('/:id/confirm', auth, roles('USER'), ctrl.confirmCompletion);

module.exports = router;
