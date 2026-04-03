const mongoose = require('mongoose')

const otpSchema = new mongoose.Schema(
  {
    email: { type: String, trim: true, lowercase: true, required: true, index: true },
    purpose: { type: String, required: true, enum: ['auth', 'forgot_password'], index: true },
    otpHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true, index: true },
    consumedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

otpSchema.methods.isActive = function isActive() {
  return !this.consumedAt && this.expiresAt.getTime() > Date.now()
}

const Otp = mongoose.models.Otp || mongoose.model('Otp', otpSchema)

module.exports = { Otp }
