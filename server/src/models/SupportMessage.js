const mongoose = require('mongoose')

const supportMessageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    name: { type: String, trim: true, required: true },
    email: { type: String, trim: true, lowercase: true, required: true },
    subject: { type: String, trim: true, required: true },
    message: { type: String, trim: true, required: true },
    adminEmail: { type: String, trim: true, default: 'admin@wellsphere.com' },
    status: { type: String, enum: ['open', 'resolved'], default: 'open', index: true },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

supportMessageSchema.methods.toPublic = function toPublic() {
  return {
    id: String(this._id),
    userId: this.userId ? String(this.userId) : null,
    name: this.name,
    email: this.email,
    subject: this.subject,
    message: this.message,
    adminEmail: this.adminEmail,
    status: this.status,
    createdAt: this.createdAt,
    resolvedAt: this.resolvedAt,
  }
}

const SupportMessage = mongoose.models.SupportMessage || mongoose.model('SupportMessage', supportMessageSchema)

module.exports = { SupportMessage }
