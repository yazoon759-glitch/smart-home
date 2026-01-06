const bcrypt = require('bcryptjs');
const ServiceProvider = require('../models/ServiceProvider');
const ServiceCategory = require('../models/ServiceCategory');
const User = require('../models/User');

const badRequest = (message) => {
  const err = new Error(message);
  err.status = 400;
  return err;
};

const parseLimit = (value, fallback = 100, max = 500) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.min(num, max);
};

const ensureCategory = async (categoryId) => {
  if (!categoryId) throw badRequest('serviceCategoryId is required');
  const category = await ServiceCategory.findOne({ _id: categoryId, isActive: true });
  if (!category) throw badRequest('Category not found or inactive');
  return category;
};

const findOrCreateUser = async (userId, userPayload) => {
  let user = userId ? await User.findById(userId) : null;
  if (!user && userPayload) {
    const { password, ...rest } = userPayload;
    if (!password) throw badRequest('Password is required for new user');
    if (!rest.firstName || !rest.lastName || !rest.email || !rest.phone) {
      throw badRequest('firstName, lastName, email, and phone are required for new user');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    user = await User.create({ ...rest, passwordHash, role: 'PROVIDER' });
  }
  if (!user) throw badRequest('User data missing');
  if (user.role !== 'PROVIDER') {
    user.role = 'PROVIDER';
    await user.save();
  }
  return user;
};

exports.list = async (req, res, next) => {
  try {
    const filter = {};
    const limit = parseLimit(req.query.limit);
    if (req.query.serviceCategoryId) filter.serviceCategoryId = req.query.serviceCategoryId;
    if (req.query.isActive === 'true') filter.isActive = true;
    if (req.query.isActive === 'false') filter.isActive = false;

    const providers = await ServiceProvider.find(filter)
      .sort('-createdAt')
      .limit(limit)
      .populate('serviceCategoryId', 'name')
      .populate('userId', 'firstName lastName email phone role isActive')
      .lean();

    res.json(providers);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { userId, user: userPayload, serviceCategoryId, ...profile } = req.body || {};
    await ensureCategory(serviceCategoryId);
    const user = await findOrCreateUser(userId, userPayload);

    const updatePayload = { ...profile, serviceCategoryId };
    if (profile.isActive === undefined) updatePayload.isActive = true;
    if (profile.fixedLatitude !== undefined && profile.fixedLongitude !== undefined) {
      updatePayload.location = { type: 'Point', coordinates: [profile.fixedLongitude, profile.fixedLatitude] };
    }

    const provider = await ServiceProvider.findOneAndUpdate(
      { userId: user._id },
      updatePayload,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(provider);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const updates = { ...req.body };
    if (updates.serviceCategoryId) {
      await ensureCategory(updates.serviceCategoryId);
    }
    if (updates.fixedLatitude !== undefined && updates.fixedLongitude !== undefined) {
      updates.location = { type: 'Point', coordinates: [updates.fixedLongitude, updates.fixedLatitude] };
    }
    const provider = await ServiceProvider.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!provider) return res.status(404).json({ message: 'Provider not found' });
    res.json(provider);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const provider = await ServiceProvider.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!provider) return res.status(404).json({ message: 'Provider not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
