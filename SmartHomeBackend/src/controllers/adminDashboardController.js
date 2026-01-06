const User = require('../models/User');
const ServiceProvider = require('../models/ServiceProvider');
const ServiceCategory = require('../models/ServiceCategory');
const ServiceRequest = require('../models/ServiceRequest');
const WalletTransaction = require('../models/WalletTransaction');

const parseLimit = (value, fallback = 50, max = 200) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.min(num, max);
};

exports.overview = async (req, res, next) => {
  try {
    const [
      userCount,
      providerCount,
      categoryCount,
      requestGroups,
      pendingTransactions,
      recentRequests,
      recentTransactions
    ] = await Promise.all([
      User.countDocuments(),
      ServiceProvider.countDocuments({ isActive: { $ne: false } }),
      ServiceCategory.countDocuments(),
      ServiceRequest.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      WalletTransaction.countDocuments({ status: 'PENDING' }),
      ServiceRequest.find().sort('-createdAt').limit(5)
        .populate('userId', 'firstName lastName email')
        .populate({ path: 'providerId', populate: { path: 'userId', select: 'firstName lastName email' } })
        .populate('serviceCategoryId', 'name')
        .lean(),
      WalletTransaction.find().sort('-createdAt').limit(5)
        .populate('userId', 'firstName lastName email')
        .populate({ path: 'providerId', populate: { path: 'userId', select: 'firstName lastName email' } })
        .populate('relatedServiceRequestId', 'status paymentStatus')
        .lean()
    ]);

    const requestsByStatus = requestGroups.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    res.json({
      counts: {
        users: userCount,
        providers: providerCount,
        categories: categoryCount,
        pendingTransactions
      },
      requestsByStatus,
      recent: {
        requests: recentRequests,
        transactions: recentTransactions
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.listRequests = async (req, res, next) => {
  try {
    const { status, userId, providerId } = req.query;
    const limit = parseLimit(req.query.limit);
    const filter = {};
    if (status) filter.status = status;
    if (userId) filter.userId = userId;
    if (providerId) filter.providerId = providerId;

    const requests = await ServiceRequest.find(filter)
      .sort('-createdAt')
      .limit(limit)
      .populate('userId', 'firstName lastName email')
      .populate({ path: 'providerId', populate: { path: 'userId', select: 'firstName lastName email' } })
      .populate('serviceCategoryId', 'name')
      .populate('userLocationId')
      .lean();

    res.json(requests);
  } catch (err) {
    next(err);
  }
};

exports.listTransactions = async (req, res, next) => {
  try {
    const { status, type, providerId, userId } = req.query;
    const limit = parseLimit(req.query.limit);
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (providerId) filter.providerId = providerId;
    if (userId) filter.userId = userId;

    const transactions = await WalletTransaction.find(filter)
      .sort('-createdAt')
      .limit(limit)
      .populate('userId', 'firstName lastName email')
      .populate({ path: 'providerId', populate: { path: 'userId', select: 'firstName lastName email' } })
      .populate('relatedServiceRequestId', 'status paymentStatus')
      .lean();

    res.json(transactions);
  } catch (err) {
    next(err);
  }
};
