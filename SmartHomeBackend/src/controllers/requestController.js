const ServiceRequest = require('../models/ServiceRequest');
const ServiceProvider = require('../models/ServiceProvider');
const WalletTransaction = require('../models/WalletTransaction');
const User = require('../models/User');
const ServiceCategory = require('../models/ServiceCategory');
const Rating = require('../models/Rating');
const { haversineKm } = require('../utils/distance');
const walletService = require('../services/walletService');

const releaseWalletHold = async (sr) => {
  if (!sr || sr.paymentMethod !== 'WALLET' || sr.paymentStatus === 'PAID') return;
  const hold = sr.walletHoldAmount || 0;
  if (hold <= 0) return;
  const user = await User.findById(sr.userId);
  if (!user) return;
  user.walletBalance += hold;
  await user.save();
  await WalletTransaction.create({
    userId: sr.userId,
    type: 'PAYMENT_HOLD_RELEASE',
    amount: hold,
    status: 'APPROVED',
    relatedServiceRequestId: sr._id
  });
  sr.walletHoldAmount = 0;
  if (sr.paymentStatus === 'HOLD') {
    sr.paymentStatus = 'UNPAID';
  }
  await sr.save();
};

exports.create = async (req, res, next) => {
  try {
    const category = await ServiceCategory.findById(req.body.serviceCategoryId).select('basePrice');
    if (!category) return res.status(400).json({ message: 'Invalid service category' });

    const paymentMethod = req.body.paymentMethod;
    if (!paymentMethod) {
      return res.status(400).json({ message: 'paymentMethod is required' });
    }
    if (!['WALLET', 'CASH'].includes(paymentMethod)) {
      return res.status(400).json({ message: 'Invalid payment method' });
    }
    const holdAmount = paymentMethod === 'WALLET' ? category.basePrice : 0;
    let user;

    if (paymentMethod === 'WALLET') {
      user = await User.findById(req.user._id).select('walletBalance');
      if (!user) return res.status(404).json({ message: 'User not found' });
      if (user.walletBalance < holdAmount) {
        return res.status(400).json({ message: 'Insufficient wallet balance' });
      }
    }

    const body = {
      ...req.body,
      userId: req.user._id,
      status: 'PENDING',
      paymentStatus: paymentMethod === 'WALLET' ? 'HOLD' : 'UNPAID',
      price: category.basePrice,
      walletHoldAmount: holdAmount
    };

    const sr = await ServiceRequest.create(body);

    if (holdAmount > 0) {
      try {
        user.walletBalance -= holdAmount;
        await user.save();
        await WalletTransaction.create({
          userId: req.user._id,
          type: 'PAYMENT_HOLD',
          amount: holdAmount,
          status: 'APPROVED',
          relatedServiceRequestId: sr._id
        });
      } catch (err) {
        await ServiceRequest.deleteOne({ _id: sr._id });
        throw err;
      }
    }

    res.status(201).json(sr);
  } catch (err) {
    next(err);
  }
};

exports.listMine = async (req, res, next) => {
  try {
    const list = await ServiceRequest.find({ userId: req.user._id }).sort('-createdAt').lean();
    if (list.length === 0) return res.json([]);

    const serviceRequestIds = list.map((r) => r._id);
    const rated = await Rating.find({
      userId: req.user._id,
      serviceRequestId: { $in: serviceRequestIds }
    }).select('serviceRequestId').lean();
    const ratedSet = new Set(rated.map((r) => r.serviceRequestId.toString()));

    res.json(list.map((r) => ({
      ...r,
      isRated: ratedSet.has(r._id.toString())
    })));
  } catch (err) {
    next(err);
  }
};

exports.listPendingApprovals = async (req, res, next) => {
  try {
    const list = await ServiceRequest.find({
      userId: req.user._id,
      status: 'COMPLETED',
      paymentStatus: { $in: ['PENDING_USER_CONFIRMATION', 'HOLD'] }
    }).sort('-updatedAt');
    res.json(list);
  } catch (err) {
    next(err);
  }
};

exports.listCompletedForProvider = async (req, res, next) => {
  try {
    const provider = await ServiceProvider.findOne({ userId: req.user._id });
    if (!provider) {
      return res.status(400).json({ message: 'Provider profile missing' });
    }

    const list = await ServiceRequest.find({
      providerId: provider._id,
      status: 'COMPLETED'
    })
      .sort('-updatedAt')
      .populate('userId', 'firstName lastName phone email')
      .populate('userLocationId')
      .populate('serviceCategoryId', 'name')
      .lean();

    res.json(list);
  } catch (err) {
    next(err);
  }
};

exports.listNearby = async (req, res, next) => {
  try {
    const provider = await ServiceProvider.findOne({ userId: req.user._id });
    if (!provider) {
      return res.status(400).json({ message: 'Provider profile missing' });
    }
    if (!provider.serviceCategoryId) {
      return res.status(400).json({ message: 'Set service category first' });
    }

    const hasCoordinates = provider.location && provider.location.coordinates.length === 2;
    const [availableRequests, myActiveRequests] = await Promise.all([
      ServiceRequest.find({
        status: 'PENDING',
        serviceCategoryId: provider.serviceCategoryId
      }).populate('userLocationId'),
      ServiceRequest.find({
        providerId: provider._id,
        status: { $in: ['ACCEPTED', 'IN_PROGRESS'] }
      }).populate('userLocationId')
    ]);

    if (!hasCoordinates && myActiveRequests.length === 0) {
      return res.status(400).json({ message: 'Set fixed location first' });
    }

    const combined = hasCoordinates ? [...myActiveRequests, ...availableRequests] : [...myActiveRequests];
    const unique = Array.from(
      combined.reduce((map, r) => map.set(r._id.toString(), r), new Map()).values()
    );

    const [lng, lat] = hasCoordinates ? provider.location.coordinates : [undefined, undefined];
    const withDistance = unique.map((r) => {
      const ul = r.userLocationId;
      const distance = hasCoordinates && ul
        ? haversineKm(lat, lng, ul.latitude, ul.longitude)
        : null;
      const isAssignedToMe = r.providerId && r.providerId.toString() === provider._id.toString();
      return { r, distance, isAssignedToMe };
    }).sort((a, b) => {
      if (a.isAssignedToMe && !b.isAssignedToMe) return -1;
      if (!a.isAssignedToMe && b.isAssignedToMe) return 1;
      if (a.distance === null && b.distance === null) return 0;
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });

    res.json(withDistance.map(({ r, distance, isAssignedToMe }) => ({
      ...r.toObject(),
      distanceKm: distance,
      isAssignedToMe
    })));
  } catch (err) {
    next(err);
  }
};

exports.accept = async (req, res, next) => {
  try {
    const provider = await ServiceProvider.findOne({ userId: req.user._id });
    if (!provider) return res.status(400).json({ message: 'Provider profile missing' });
    if (!provider.serviceCategoryId) return res.status(400).json({ message: 'Service category missing on profile' });
    const sr = await ServiceRequest.findOneAndUpdate(
      {
        _id: req.params.id,
        status: 'PENDING',
        serviceCategoryId: provider.serviceCategoryId
      },
      { providerId: provider._id, status: 'ACCEPTED' },
      { new: true }
    );
    if (!sr) return res.status(404).json({ message: 'Not found or already claimed' });
    res.json(sr);
  } catch (err) {
    next(err);
  }
};

exports.reject = async (req, res, next) => {
  try {
    const provider = await ServiceProvider.findOne({ userId: req.user._id });
    if (!provider) return res.status(400).json({ message: 'Provider profile missing' });
    if (!provider.serviceCategoryId) return res.status(400).json({ message: 'Service category missing on profile' });

    const sr = await ServiceRequest.findById(req.params.id);
    if (!sr) return res.status(404).json({ message: 'Request not found' });

    if (sr.serviceCategoryId.toString() !== provider.serviceCategoryId.toString()) {
      return res.status(403).json({ message: 'Request not in your service category' });
    }

    const allowedStatuses = ['PENDING', 'ACCEPTED'];
    if (!allowedStatuses.includes(sr.status)) {
      return res.status(400).json({ message: `Cannot reject a request in ${sr.status} status` });
    }

    if (sr.providerId && sr.providerId.toString() !== provider._id.toString()) {
      return res.status(403).json({ message: 'Request is assigned to another provider' });
    }

    sr.providerId = provider._id;
    sr.status = 'REJECTED';
    await sr.save();
    await releaseWalletHold(sr);
    res.json(sr);
  } catch (err) {
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (status !== 'CANCELED') {
      return res.status(400).json({ message: 'Users can only cancel their request' });
    }
    const sr = await ServiceRequest.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id, status: { $in: ['PENDING', 'ACCEPTED'] } },
      { status: 'CANCELED' },
      { new: true }
    );
    if (!sr) return res.status(404).json({ message: 'Not found or not cancellable' });
    await releaseWalletHold(sr);
    res.json(sr);
  } catch (err) {
    next(err);
  }
};

exports.confirmCompletion = async (req, res, next) => {
  try {
    const sr = await ServiceRequest.findOne({ _id: req.params.id, userId: req.user._id });
    if (!sr) return res.status(404).json({ message: 'Request not found' });
    if (sr.status !== 'COMPLETED') {
      return res.status(400).json({ message: 'Provider has not completed this request yet' });
    }
    if (sr.paymentMethod !== 'CASH') {
      return res.status(400).json({ message: 'Use wallet payment endpoint for wallet payments' });
    }
    if (sr.paymentStatus === 'PAID') {
      return res.status(400).json({ message: 'Payment already confirmed' });
    }
    if (sr.paymentStatus !== 'PENDING_USER_CONFIRMATION') {
      return res.status(400).json({ message: 'Payment is not ready for confirmation' });
    }
    const amount = sr.finalAmount || sr.price;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Missing payable amount, please contact support' });
    }
    sr.paymentStatus = 'PAID';
    await sr.save();
    res.json(sr);
  } catch (err) {
    next(err);
  }
};

exports.acceptPayment = async (req, res, next) => {
  try {
    const sr = await ServiceRequest.findOne({ _id: req.params.id, userId: req.user._id });
    if (!sr) return res.status(404).json({ message: 'Request not found' });
    if (sr.status !== 'COMPLETED') {
      return res.status(400).json({ message: 'Provider has not completed this request yet' });
    }
    if (sr.paymentStatus === 'PAID') {
      return res.status(400).json({ message: 'Payment already confirmed' });
    }
    if (!['PENDING_USER_CONFIRMATION', 'HOLD'].includes(sr.paymentStatus)) {
      return res.status(400).json({ message: 'Payment is not ready for user confirmation' });
    }
    const payable = sr.finalAmount || sr.price;
    if (!payable || payable <= 0) {
      return res.status(400).json({ message: 'Missing payable amount, please contact support' });
    }

    if (sr.paymentMethod === 'CASH') {
      sr.paymentStatus = 'PAID';
      await sr.save();
      return res.json({ serviceRequest: sr, transactions: [], providerTransaction: null, paidAmount: payable });
    }

    const result = await walletService.payWithWallet(sr._id, req.user._id);
    return res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.updateStatusByProvider = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['IN_PROGRESS', 'COMPLETED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status for provider' });
    }

    const provider = await ServiceProvider.findOne({ userId: req.user._id });
    if (!provider) return res.status(400).json({ message: 'Provider profile missing' });

    const sr = await ServiceRequest.findOne({ _id: req.params.id, providerId: provider._id });
    if (!sr) return res.status(404).json({ message: 'Request not found or not assigned to you' });

    const allowedTransitions = {
      ACCEPTED: ['IN_PROGRESS', 'COMPLETED'],
      IN_PROGRESS: ['COMPLETED']
    };
    const nextStatuses = allowedTransitions[sr.status] || [];
    if (!nextStatuses.includes(status)) {
      return res.status(400).json({ message: `Cannot move from ${sr.status} to ${status}` });
    }

    if (status === 'COMPLETED') {
      const amount = Number(req.body.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ message: 'Amount is required when completing a request and must be greater than zero' });
      }
      sr.price = amount;
      sr.finalAmount = amount;
      if (sr.paymentStatus !== 'PAID') {
        sr.paymentStatus = 'PENDING_USER_CONFIRMATION';
      }
    }

    sr.status = status;
    await sr.save();
    res.json(sr);
  } catch (err) {
    next(err);
  }
};

// Convenience endpoint to mark a request as completed; amount is still required in the body.
exports.completeByProvider = (req, res, next) => {
  if (req.body.amount === undefined) {
    return res.status(400).json({ message: 'Amount is required when completing a request' });
  }
  req.body.status = 'COMPLETED';
  return exports.updateStatusByProvider(req, res, next);
};

exports.cashInRequest = async (req, res, next) => {
  try {
    const provider = await ServiceProvider.findOne({ userId: req.user._id });
    if (!provider) return res.status(400).json({ message: 'Provider profile missing' });
    const sr = await ServiceRequest.findOne({ _id: req.params.id, providerId: provider._id });
    if (!sr) return res.status(404).json({ message: 'Request not found or not assigned to you' });
    const tx = await WalletTransaction.create({
      providerId: provider._id,
      userId: sr.userId,
      type: 'CASH_IN_REQUEST',
      amount: req.body.amount,
      relatedServiceRequestId: sr._id,
      status: 'PENDING'
    });
    res.status(201).json(tx);
  } catch (err) {
    next(err);
  }
};
