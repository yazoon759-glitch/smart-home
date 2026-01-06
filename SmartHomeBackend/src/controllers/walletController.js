const WalletTransaction = require('../models/WalletTransaction');
const ServiceProvider = require('../models/ServiceProvider');
const ServiceRequest = require('../models/ServiceRequest');
const User = require('../models/User');
const walletService = require('../services/walletService');

// Returns lightweight reference data for admin dropdowns to avoid manual ObjectId inputs.
exports.adminOptions = async (req, res, next) => {
  try {
    const [users, providers, serviceRequests, pendingTransactions] = await Promise.all([
      User.find()
        .sort({ firstName: 1, lastName: 1 })
        .limit(200)
        .select('firstName lastName email phone role isActive')
        .lean(),
      ServiceProvider.find()
        .sort('-createdAt')
        .limit(200)
        .populate('userId', 'firstName lastName email phone isActive role')
        .populate('serviceCategoryId', 'name')
        .lean(),
      ServiceRequest.find()
        .sort('-createdAt')
        .limit(200)
        .populate('userId', 'firstName lastName email phone')
        .populate({ path: 'providerId', populate: { path: 'userId', select: 'firstName lastName email phone' } })
        .populate('serviceCategoryId', 'name')
        .lean(),
      WalletTransaction.find({ status: 'PENDING' })
        .sort('-createdAt')
        .limit(200)
        .populate('userId', 'firstName lastName email')
        .populate({ path: 'providerId', populate: { path: 'userId', select: 'firstName lastName email' } })
        .populate('relatedServiceRequestId', 'status paymentStatus serviceCategoryId providerId userId')
        .lean()
    ]);

    res.json({ users, providers, serviceRequests, pendingTransactions });
  } catch (err) {
    next(err);
  }
};

exports.getWallet = async (req, res, next) => {
  try {
    if (req.user.role === 'PROVIDER') {
      const provider = await ServiceProvider.findOne({ userId: req.user._id });
      const txs = await WalletTransaction.find({ providerId: provider?._id }).sort('-createdAt');
      return res.json({ balance: provider?.walletBalance || 0, transactions: txs });
    }
    const txs = await WalletTransaction.find({ userId: req.user._id }).sort('-createdAt');
    res.json({ balance: req.user.walletBalance, transactions: txs });
  } catch (err) {
    next(err);
  }
};

exports.topUpUser = async (req, res, next) => {
  try {
    const tx = await walletService.topUpUser(req.body.userId, req.body.amount);
    res.status(201).json(tx);
  } catch (err) {
    next(err);
  }
};

exports.topUpProvider = async (req, res, next) => {
  try {
    const tx = await walletService.adjustProvider(req.body.providerId, req.body.amount);
    res.status(201).json(tx);
  } catch (err) {
    next(err);
  }
};

exports.payWithWallet = async (req, res, next) => {
  try {
    const result = await walletService.payWithWallet(req.params.requestId, req.user._id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.cashInApprove = async (req, res, next) => {
  try {
    const tx = await walletService.approveCashIn(req.params.transactionId);
    res.json(tx);
  } catch (err) {
    next(err);
  }
};

exports.cashInReject = async (req, res, next) => {
  try {
    const tx = await walletService.rejectTx(req.params.transactionId);
    res.json(tx);
  } catch (err) {
    next(err);
  }
};

exports.providerEarning = async (req, res, next) => {
  try {
    const tx = await walletService.providerEarning(req.body.providerId, req.body.serviceRequestId, req.body.amount);
    res.status(201).json(tx);
  } catch (err) {
    next(err);
  }
};

exports.withdrawRequest = async (req, res, next) => {
  try {
    const provider = await ServiceProvider.findOne({ userId: req.user._id });
    if (!provider) return res.status(400).json({ message: 'Provider profile missing' });
    const tx = await walletService.withdrawRequest(provider._id, req.body.amount);
    res.status(201).json(tx);
  } catch (err) {
    next(err);
  }
};

exports.withdrawApprove = async (req, res, next) => {
  try {
    const tx = await walletService.approveWithdraw(req.params.transactionId);
    res.json(tx);
  } catch (err) {
    next(err);
  }
};
