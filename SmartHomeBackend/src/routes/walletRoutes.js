const router = require('express').Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const ctrl = require('../controllers/walletController');

router.use(auth);
router.get('/', ctrl.getWallet);
router.post('/pay/:requestId', roles('USER'), ctrl.payWithWallet);

module.exports = router;
