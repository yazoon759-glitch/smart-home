const mongoose = require('mongoose');

const serviceProviderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  serviceCategoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceCategory',
    required: true,
    index: true
  },
  isActive: { type: Boolean, default: true },
  fixedLatitude: Number,
  fixedLongitude: Number,
  addressLine: String,
  serviceRadiusKm: Number,
  experienceYears: Number,
  bio: String,
  walletBalance: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0 },
  totalCompletedJobs: { type: Number, default: 0 },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [] } // [lng, lat]
  }
}, { timestamps: true });

serviceProviderSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('ServiceProvider', serviceProviderSchema);
