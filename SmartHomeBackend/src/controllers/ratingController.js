const Rating = require('../models/Rating');
const ServiceRequest = require('../models/ServiceRequest');
const ServiceProvider = require('../models/ServiceProvider');

exports.create = async (req, res, next) => {
  try {
    const { serviceRequestId, score, comment } = req.body;
    const sr = await ServiceRequest.findOne({ _id: serviceRequestId, userId: req.user._id });
    if (!sr || sr.status !== 'COMPLETED') {
      return res.status(400).json({ message: 'You can rate only after the provider completes the request' });
    }

    const existing = await Rating.findOne({ serviceRequestId, userId: req.user._id });
    if (existing) return res.status(409).json({ message: 'You already rated this request' });

    const rating = await Rating.create({
      userId: req.user._id,
      providerId: sr.providerId,
      serviceRequestId,
      score,
      comment
    });
    const agg = await Rating.aggregate([
      { $match: { providerId: sr.providerId } },
      { $group: { _id: '$providerId', avg: { $avg: '$score' }, count: { $sum: 1 } } }
    ]);
    if (agg.length) {
      await ServiceProvider.findByIdAndUpdate(sr.providerId, { averageRating: agg[0].avg, totalCompletedJobs: agg[0].count });
    }
    res.status(201).json(rating);
  } catch (err) {
    next(err);
  }
};

exports.listForProvider = async (req, res, next) => {
  try {
    const ratings = await Rating.find({ providerId: req.params.providerId }).sort('-createdAt');
    res.json(ratings);
  } catch (err) {
    next(err);
  }
};
