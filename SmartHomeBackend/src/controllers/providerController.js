const User = require('../models/User');
const ServiceProvider = require('../models/ServiceProvider');
const ServiceCategory = require('../models/ServiceCategory');
const { haversineKm } = require('../utils/distance');

exports.register = async (req, res, next) => {
  try {
    const { user: userPayload, userId, serviceCategoryId, ...profile } = req.body;

    if (!serviceCategoryId) {
      return res.status(400).json({ message: 'serviceCategoryId is required' });
    }
    const category = await ServiceCategory.findOne({ _id: serviceCategoryId, isActive: true });
    if (!category) return res.status(404).json({ message: 'Category not found or inactive' });

    let user = userId ? await User.findById(userId) : null;
    if (!user && userPayload) {
      const existing = await User.findOne({ $or: [{ email: userPayload.email }, { phone: userPayload.phone }] });
      if (existing) return res.status(409).json({ message: 'Email or phone exists' });
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash(userPayload.password, 10);
      user = await User.create({ ...userPayload, passwordHash, role: 'PROVIDER' });
    } else if (user && user.role !== 'PROVIDER') {
      user.role = 'PROVIDER';
      await user.save();
    }

    if (!user) return res.status(400).json({ message: 'User data missing' });

    const location = profile.fixedLongitude !== undefined && profile.fixedLatitude !== undefined
      ? { type: 'Point', coordinates: [profile.fixedLongitude, profile.fixedLatitude] }
      : undefined;

    const updatePayload = { ...profile, serviceCategoryId };
    if (location) updatePayload.location = location;

    const provider = await ServiceProvider.findOneAndUpdate(
      { userId: user._id },
      updatePayload,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ user, provider });
  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res, next) => {
  try {
    const provider = await ServiceProvider.findOne({ userId: req.user._id }).populate('serviceCategoryId');
    if (!provider) return res.status(404).json({ message: 'Not found' });
    res.json(provider);
  } catch (err) {
    next(err);
  }
};

exports.updateMe = async (req, res, next) => {
  try {
    const updates = { ...req.body };
    if ('serviceCategoryId' in updates) {
      if (!updates.serviceCategoryId) {
        return res.status(400).json({ message: 'serviceCategoryId is required' });
      }
      const category = await ServiceCategory.findOne({ _id: updates.serviceCategoryId, isActive: true });
      if (!category) return res.status(404).json({ message: 'Category not found or inactive' });
    }
    if (updates.fixedLatitude !== undefined && updates.fixedLongitude !== undefined) {
      updates.location = { type: 'Point', coordinates: [updates.fixedLongitude, updates.fixedLatitude] };
    }
    const provider = await ServiceProvider.findOneAndUpdate({ userId: req.user._id }, updates, { new: true });
    if (!provider) return res.status(404).json({ message: 'Not found' });
    res.json(provider);
  } catch (err) {
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const { serviceCategoryId, name } = req.query;
    const filter = {};
    const includeInactive = req.query.includeInactive === 'true';
    if (serviceCategoryId) filter.serviceCategoryId = serviceCategoryId;
    if (!includeInactive) filter.isActive = { $ne: false };

    const providers = await ServiceProvider.find(filter)
      .populate('serviceCategoryId')
      .populate('userId', 'firstName lastName email phone role isActive')
      .lean();

    const nameQuery = (name || '').trim();
    const nameRegex = nameQuery ? new RegExp(nameQuery, 'i') : null;
    const filteredProviders = nameRegex
      ? providers.filter((provider) => {
        const user = provider.userId || {};
        const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
        if (!fullName) return false;
        return nameRegex.test(fullName);
      })
      : providers;

    const latitudeRaw = req.query.latitude ?? req.query.lat;
    const longitudeRaw = req.query.longitude ?? req.query.lng;
    const hasCoordinates = latitudeRaw !== undefined || longitudeRaw !== undefined;

    if (!hasCoordinates) {
      return res.json(filteredProviders);
    }

    const latitude = Number(latitudeRaw);
    const longitude = Number(longitudeRaw);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({ message: 'latitude and longitude must be valid numbers' });
    }

    const sorted = filteredProviders
      .map((provider) => {
        const [provLng, provLat] = provider.location?.coordinates || [];
        const distanceKm = Number.isFinite(provLat) && Number.isFinite(provLng)
          ? haversineKm(latitude, longitude, provLat, provLng)
          : Number.MAX_SAFE_INTEGER;
        return { ...provider, distanceKm };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);

    res.json(sorted);
  } catch (err) {
    next(err);
  }
};
