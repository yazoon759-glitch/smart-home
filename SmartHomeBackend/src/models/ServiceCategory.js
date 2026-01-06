const mongoose = require('mongoose');

const serviceCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  basePrice: { type: Number, required: true },
  icon: { type: String, default: null },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('ServiceCategory', serviceCategorySchema);
