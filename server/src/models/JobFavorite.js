const mongoose = require('mongoose')

const jobFavoriteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
  },
  { timestamps: true }
)

jobFavoriteSchema.index({ userId: 1, jobId: 1 }, { unique: true })

const JobFavorite = mongoose.models.JobFavorite || mongoose.model('JobFavorite', jobFavoriteSchema)

module.exports = { JobFavorite }
