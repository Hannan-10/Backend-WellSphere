const mongoose = require('mongoose')

const jobViewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    viewedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

jobViewSchema.index({ userId: 1, jobId: 1 }, { unique: true })

const JobView = mongoose.models.JobView || mongoose.model('JobView', jobViewSchema)

module.exports = { JobView }
