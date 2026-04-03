const mongoose = require('mongoose')

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    jti: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

refreshTokenSchema.methods.isActive = function isActive() {
  return !this.revokedAt && this.expiresAt.getTime() > Date.now()
}

const RefreshToken = mongoose.models.RefreshToken || mongoose.model('RefreshToken', refreshTokenSchema)

module.exports = { RefreshToken }
