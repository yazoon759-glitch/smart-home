const router = require('express').Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const ctrl = require('../controllers/providerController');
const reqCtrl = require('../controllers/requestController');
const walletCtrl = require('../controllers/walletController');

router.get('/', ctrl.list);
router.post('/register', ctrl.register);
router.get('/me', auth, roles('PROVIDER'), ctrl.me);
router.put('/me', auth, roles('PROVIDER'), ctrl.updateMe);

router.get('/requests', auth, roles('PROVIDER'), reqCtrl.listNearby);
router.get('/requests/completed', auth, roles('PROVIDER'), reqCtrl.listCompletedForProvider);
router.patch('/requests/:id/accept', auth, roles('PROVIDER'), reqCtrl.accept);
router.patch('/requests/:id/reject', auth, roles('PROVIDER'), reqCtrl.reject);
router.patch('/requests/:id/status', auth, roles('PROVIDER'), reqCtrl.updateStatusByProvider);
router.patch('/requests/:id/complete', auth, roles('PROVIDER'), reqCtrl.completeByProvider);
router.post('/requests/:id/cash-in', auth, roles('PROVIDER'), reqCtrl.cashInRequest);

router.post('/wallet/withdraw-request', auth, roles('PROVIDER'), walletCtrl.withdrawRequest);

module.exports = router;
