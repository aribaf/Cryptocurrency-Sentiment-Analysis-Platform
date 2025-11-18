const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const TransactionSchema = new Schema({
  txHash: { type: String, index: true },
  blockchain: String,
  currency: String,
  symbol: String,
  amount: Number,
  valueUsd: Number,
  from: String,
  to: String,
  timestamp: Date,
  meta: Schema.Types.Mixed
}, { timestamps: true });
module.exports = mongoose.model('Transaction', TransactionSchema);
