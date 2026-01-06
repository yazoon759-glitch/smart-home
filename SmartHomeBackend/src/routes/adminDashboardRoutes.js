const router = require('express').Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const ctrl = require('../controllers/adminDashboardController');

router.use(auth, roles('ADMIN', 'MANAGER'));

router.get('/overview', ctrl.overview);
router.get('/requests', ctrl.listRequests);
router.get('/transactions', ctrl.listTransactions);

module.exports = router;
