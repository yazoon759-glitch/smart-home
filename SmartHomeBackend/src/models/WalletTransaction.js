const mongoose = require('mongoose');

const txTypes = [
  'ADMIN_TOP_UP',
  'PAYMENT',
  'PAYMENT_HOLD',
  'PAYMENT_HOLD_RELEASE',
  'CASH_IN_REQUEST',
  'CASH_IN_APPROVED',
  'PROVIDER_EARNING',
  'WITHDRAWAL_REQUEST',
  'WITHDRAWAL_APPROVED',
  'ADMIN_ADJUSTMENT'
];

const txStatus = ['PENDING', 'APPROVED', 'REJECTED'];

const walletTxSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceProvider' },
  type: { type: String, enum: txTypes, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: txStatus, default: 'PENDING' },
  relatedServiceRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceRequest' }
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('WalletTransaction', walletTxSchema);
module.exports.txTypes = txTypes;
module.exports.txStatus = txStatus;
