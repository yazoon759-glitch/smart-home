const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceProvider', required: true },
  serviceRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceRequest', required: true, unique: true },
  score: { type: Number, min: 1, max: 5, required: true },
  comment: String
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('Rating', ratingSchema);
