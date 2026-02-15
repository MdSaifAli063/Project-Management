const mongoose = require('mongoose');

// Stores hashed tokens for email verification & password reset & refresh revocation
const tokenSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  type: { type: String, enum: ['verify_email', 'reset_password', 'refresh_whitelist'], required: true },
  tokenHash: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Token', tokenSchema);