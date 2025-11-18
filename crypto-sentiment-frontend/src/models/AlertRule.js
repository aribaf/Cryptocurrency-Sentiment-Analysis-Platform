const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const AlertRuleSchema = new Schema({
  currency: { type: String, default: 'all' },
  minValueUsd: { type: Number, required: true },
  method: { type: String, enum: ['email','webhook','ui'], default: 'ui' },
  enabled: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('AlertRule', AlertRuleSchema);
