const mongoose = require('mongoose')

const jobSchema = new mongoose.Schema(
  {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    businessName: { type: String, trim: true, required: true },
    jobTitle: { type: String, trim: true, required: true },
    employmentType: {
      type: String,
      required: true,
      enum: ['Part-time', 'Full-time', 'Contract', 'Freelance', 'Seasonal', 'Residency'],
    },
    country: { type: String, trim: true, required: true },
    location: { type: String, trim: true, required: true },
    applicationEmail: { type: String, trim: true, required: true },

    description: { type: String, trim: true, required: true },
    skills: { type: [String], default: [] },

    image: { type: String, trim: true, default: '' },

    salary: {
      min: { type: Number, default: null },
      max: { type: Number, default: null },
      currency: { type: String, trim: true, default: 'USD' },
    },

    benefits: { type: [String], default: [] },

    links: {
      website: { type: String, trim: true, default: '' },
      instagram: { type: String, trim: true, default: '' },
    },

    applicationStatus: { type: Number, enum: [0, 1], default: 1 },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

jobSchema.methods.toPublic = function toPublic() {
  return {
    id: String(this._id),
    createdBy: String(this.createdBy),
    businessName: this.businessName,
    jobTitle: this.jobTitle,
    employmentType: this.employmentType,
    country: this.country,
    location: this.location,
    applicationEmail: this.applicationEmail,
    description: this.description,
    skills: this.skills,
    image: this.image,
    salary: this.salary,
    benefits: this.benefits,
    links: this.links,
    applicationStatus: this.applicationStatus,
    closedAt: this.closedAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}

const Job = mongoose.models.Job || mongoose.model('Job', jobSchema)

module.exports = { Job }
