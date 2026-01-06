const mongoose = require('mongoose');

const userLocationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  locationName: String,
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  street: String,
  buildingFloor: String,
  additionalNotes: String,
  isDefault: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('UserLocation', userLocationSchema);
