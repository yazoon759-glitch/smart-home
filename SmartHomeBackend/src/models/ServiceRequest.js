const mongoose = require('mongoose');

const statusEnum = ['PENDING', 'ACCEPTED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED'];
const paymentMethods = ['WALLET', 'CASH'];
const paymentStatuses = ['UNPAID', 'HOLD', 'PENDING_USER_CONFIRMATION', 'PAID'];

const serviceRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceProvider' },
  serviceCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCategory', required: true },
  userLocationId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserLocation', required: true },
  problemDescription: { type: String, required: true },
  requestedDateTime: { type: Date, required: true },
  photoUrl: String,
  status: { type: String, enum: statusEnum, default: 'PENDING', index: true },
  price: { type: Number, required: true },
  finalAmount: { type: Number, default: null },
  paymentMethod: { type: String, enum: paymentMethods, required: true },
  paymentStatus: { type: String, enum: paymentStatuses, default: 'UNPAID' },
  walletHoldAmount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('ServiceRequest', serviceRequestSchema);
module.exports.statusEnum = statusEnum;
module.exports.paymentMethods = paymentMethods;
module.exports.paymentStatuses = paymentStatuses;
