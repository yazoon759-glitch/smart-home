const User = require('../models/User');
const ServiceProvider = require('../models/ServiceProvider');
const ServiceRequest = require('../models/ServiceRequest');
const WalletTransaction = require('../models/WalletTransaction');

exports.topUpUser = async (userId, amount) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  user.walletBalance += amount;
  await user.save();
  return WalletTransaction.create({ userId, type: 'ADMIN_TOP_UP', amount, status: 'APPROVED' });
};

exports.adjustProvider = async (providerId, amount) => {
  const provider = await ServiceProvider.findById(providerId);
  if (!provider) throw new Error('Provider not found');
  provider.walletBalance += amount;
  await provider.save();
  return WalletTransaction.create({ providerId, type: 'ADMIN_ADJUSTMENT', amount, status: 'APPROVED' });
};

exports.payWithWallet = async (requestId, userId) => {
  const sr = await ServiceRequest.findOne({ _id: requestId, userId });
  if (!sr) throw new Error('Request not found');
  if (sr.paymentMethod !== 'WALLET') throw new Error('Not wallet payment');
  if (sr.paymentStatus === 'PAID') throw new Error('Already paid');
  if (!['HOLD', 'PENDING_USER_CONFIRMATION'].includes(sr.paymentStatus)) {
    throw new Error('Payment is not ready for wallet processing');
  }
  if (sr.status !== 'COMPLETED') throw new Error('Provider has not completed the request yet');
  const payable = sr.finalAmount || sr.price;
  if (!payable || payable <= 0) throw new Error('Missing amount to pay');

  const hold = sr.walletHoldAmount || 0;
  const user = await User.findById(userId);
  const additionalDebit = Math.max(payable - hold, 0);
  if (user.walletBalance < additionalDebit) throw new Error('Insufficient balance');

  if (!sr.providerId) throw new Error('No provider assigned to this request');
  const provider = await ServiceProvider.findById(sr.providerId);
  if (!provider) throw new Error('Provider not found for this request');

  user.walletBalance -= additionalDebit;
  let releaseAmount = 0;
  if (hold > payable) {
    releaseAmount = hold - payable;
    user.walletBalance += releaseAmount;
  }

  provider.walletBalance += payable;
  sr.walletHoldAmount = 0;
  sr.paymentStatus = 'PAID';
  await user.save();
  await provider.save();
  await sr.save();

  const transactions = [];
  if (additionalDebit > 0) {
    transactions.push(await WalletTransaction.create({
      userId,
      type: 'PAYMENT',
      amount: additionalDebit,
      status: 'APPROVED',
      relatedServiceRequestId: sr._id
    }));
  }
  if (releaseAmount > 0) {
    transactions.push(await WalletTransaction.create({
      userId,
      type: 'PAYMENT_HOLD_RELEASE',
      amount: releaseAmount,
      status: 'APPROVED',
      relatedServiceRequestId: sr._id
    }));
  }

  const providerTransaction = await WalletTransaction.create({
    providerId: provider._id,
    type: 'PROVIDER_EARNING',
    amount: payable,
    status: 'APPROVED',
    relatedServiceRequestId: sr._id
  });

  return { serviceRequest: sr, transactions, providerTransaction, paidAmount: payable };
};

exports.approveCashIn = async (txId) => {
  const tx = await WalletTransaction.findById(txId);
  if (!tx || tx.type !== 'CASH_IN_REQUEST' || tx.status !== 'PENDING') throw new Error('Invalid transaction');
  const user = tx.userId ? await User.findById(tx.userId) : null;
  if (user) {
    user.walletBalance += tx.amount;
    await user.save();
  }
  tx.status = 'APPROVED';
  tx.type = 'CASH_IN_APPROVED';
  await tx.save();
  return tx;
};

exports.rejectTx = async (txId) => {
  const tx = await WalletTransaction.findById(txId);
  if (!tx || tx.status !== 'PENDING') throw new Error('Invalid transaction');
  tx.status = 'REJECTED';
  await tx.save();
  return tx;
};

exports.providerEarning = async (providerId, serviceRequestId, amount) => {
  const provider = await ServiceProvider.findById(providerId);
  if (!provider) throw new Error('Provider not found');
  provider.walletBalance += amount;
  await provider.save();
  return WalletTransaction.create({ providerId, type: 'PROVIDER_EARNING', amount, status: 'APPROVED', relatedServiceRequestId: serviceRequestId });
};

exports.withdrawRequest = async (providerId, amount) => {
  const provider = await ServiceProvider.findById(providerId);
  if (!provider || provider.walletBalance < amount) throw new Error('Insufficient funds');
  return WalletTransaction.create({ providerId, type: 'WITHDRAWAL_REQUEST', amount, status: 'PENDING' });
};

exports.approveWithdraw = async (txId) => {
  const tx = await WalletTransaction.findById(txId);
  if (!tx || tx.type !== 'WITHDRAWAL_REQUEST' || tx.status !== 'PENDING') throw new Error('Invalid transaction');
  const provider = await ServiceProvider.findById(tx.providerId);
  if (!provider || provider.walletBalance < tx.amount) throw new Error('Insufficient provider funds');
  provider.walletBalance -= tx.amount;
  await provider.save();
  tx.status = 'APPROVED';
  tx.type = 'WITHDRAWAL_APPROVED';
  await tx.save();
  return tx;
};
