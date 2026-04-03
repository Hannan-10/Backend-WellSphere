const mongoose = require('mongoose')

const jobApplicationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    status: {
      type: String,
      enum: ['submitted', 'in_review', 'interview', 'declined', 'hired', 'applied', 'interviewed', 'rejected'],
      default: 'submitted',
    },
    coverNote: { type: String, trim: true, default: '' },
    cvDocument: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
)

jobApplicationSchema.index({ userId: 1, jobId: 1 }, { unique: true })

const JobApplication = mongoose.models.JobApplication || mongoose.model('JobApplication', jobApplicationSchema)

module.exports = { JobApplication }
