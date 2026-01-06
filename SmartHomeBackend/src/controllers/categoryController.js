const ServiceCategory = require('../models/ServiceCategory');

exports.list = async (req, res, next) => {
  try {
    const { minPrice, maxPrice } = req.query;
    const filter = { isActive: true };
    if (minPrice || maxPrice) {
      filter.basePrice = {};
      if (minPrice) filter.basePrice.$gte = Number(minPrice);
      if (maxPrice) filter.basePrice.$lte = Number(maxPrice);
    }
    const categories = await ServiceCategory.find(filter);
    res.json(categories);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const cat = await ServiceCategory.create(req.body);
    res.status(201).json(cat);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const cat = await ServiceCategory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!cat) return res.status(404).json({ message: 'Not found' });
    res.json(cat);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const cat = await ServiceCategory.findByIdAndDelete(req.params.id);
    if (!cat) return res.status(404).json({ message: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
