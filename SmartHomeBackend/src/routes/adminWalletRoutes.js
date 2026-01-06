const router = require('express').Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const ctrl = require('../controllers/walletController');

router.use(auth, roles('ADMIN'));

router.get('/options', ctrl.adminOptions);
router.post('/topup-user', ctrl.topUpUser);
router.post('/topup-provider', ctrl.topUpProvider);
router.post('/cash-in/:transactionId/approve', ctrl.cashInApprove);
router.post('/cash-in/:transactionId/reject', ctrl.cashInReject);
router.post('/provider-earning', ctrl.providerEarning);
router.post('/withdraw/:transactionId/approve', ctrl.withdrawApprove);
router.post('/withdraw/:transactionId/reject', ctrl.cashInReject);

module.exports = router;
