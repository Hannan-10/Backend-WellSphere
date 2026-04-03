const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
  {
    role: { type: Number, enum: [0, 1], required: true },
    firstName: { type: String, trim: true, required: true },
    lastName: { type: String, trim: true, required: true },
    email: { type: String, trim: true, lowercase: true, required: true, unique: true },
    passwordHash: { type: String, required: false, select: false, default: null },
    authProviders: {
      google: { sub: { type: String, default: null } },
      linkedin: { sub: { type: String, default: null } },
    },
    onboardingCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
)

userSchema.methods.toPublic = function toPublic() {
  return {
    id: String(this._id),
    role: this.role,
    firstName: this.firstName,
    lastName: this.lastName,
    email: this.email,
    onboardingCompleted: Boolean(this.onboardingCompleted),
  }
}

const User = mongoose.models.User || mongoose.model('User', userSchema)

module.exports = { User }
