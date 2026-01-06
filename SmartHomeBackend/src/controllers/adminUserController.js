const bcrypt = require('bcryptjs');
const User = require('../models/User');
const ServiceProvider = require('../models/ServiceProvider');

const parseLimit = (value, fallback = 100, max = 500) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.min(num, max);
};

const safeUser = (userDoc) => {
  const obj = userDoc.toObject ? userDoc.toObject() : userDoc;
  const { passwordHash, ...safe } = obj;
  return safe;
};

exports.list = async (req, res, next) => {
  try {
    const limit = parseLimit(req.query.limit);
    const users = await User.find()
      .sort('-createdAt')
      .limit(limit)
      .lean();
    res.json(users.map(safeUser));
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { password, ...payload } = req.body || {};
    if (!password) return res.status(400).json({ message: 'Password is required' });
    if (!payload.firstName || !payload.lastName || !payload.email || !payload.phone) {
      return res.status(400).json({ message: 'firstName, lastName, email, and phone are required' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ ...payload, passwordHash });
    res.status(201).json(safeUser(user));
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { password, ...updates } = req.body || {};
    if (password) {
      updates.passwordHash = await bcrypt.hash(password, 10);
    }
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(safeUser(user));
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    await ServiceProvider.findOneAndUpdate({ userId: user._id }, { isActive: false });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
