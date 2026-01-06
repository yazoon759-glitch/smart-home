const UserLocation = require('../models/UserLocation');

exports.create = async (req, res, next) => {
  try {
    const loc = await UserLocation.create({ ...req.body, userId: req.user._id });
    res.status(201).json(loc);
  } catch (err) {
    next(err);
  }
};

exports.listMine = async (req, res, next) => {
  try {
    const locs = await UserLocation.find({ userId: req.user._id });
    res.json(locs);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const loc = await UserLocation.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true }
    );
    if (!loc) return res.status(404).json({ message: 'Not found' });
    res.json(loc);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const loc = await UserLocation.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!loc) return res.status(404).json({ message: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

exports.setDefault = async (req, res, next) => {
  try {
    await UserLocation.updateMany({ userId: req.user._id }, { isDefault: false });
    const loc = await UserLocation.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isDefault: true },
      { new: true }
    );
    if (!loc) return res.status(404).json({ message: 'Not found' });
    res.json(loc);
  } catch (err) {
    next(err);
  }
};
