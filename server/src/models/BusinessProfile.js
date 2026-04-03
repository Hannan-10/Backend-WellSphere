const mongoose = require('mongoose')

const businessProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true, index: true },

    companyName: { type: String, trim: true, default: '' },
    industry: { type: String, trim: true, default: '' },
    companySize: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    companyLogo: { type: String, trim: true, default: '' },

    about: { type: String, trim: true, default: '' },
    mission: { type: String, trim: true, default: '' },
    foundedYear: { type: String, trim: true, default: '' },
    website: { type: String, trim: true, default: '' },

    perks: { type: [String], default: [] },

    openRoles: { type: [String], default: [] },
    languages: { type: [String], default: [] },
    instagram: { type: String, trim: true, default: '' },
    linkedin: { type: String, trim: true, default: '' },
    website2: { type: String, trim: true, default: '' },

    onboardingStep: { type: Number, default: 0 },
    onboardingCompletedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

businessProfileSchema.methods.toPublic = function toPublic() {
  return {
    id: String(this._id),
    userId: String(this.userId),
    companyName: this.companyName,
    industry: this.industry,
    companySize: this.companySize,
    country: this.country,
    city: this.city,
    companyLogo: this.companyLogo,
    about: this.about,
    mission: this.mission,
    foundedYear: this.foundedYear,
    website: this.website,
    perks: this.perks,
    openRoles: this.openRoles,
    languages: this.languages,
    instagram: this.instagram,
    linkedin: this.linkedin,
    website2: this.website2,
    onboardingStep: this.onboardingStep,
    onboardingCompletedAt: this.onboardingCompletedAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}

const BusinessProfile = mongoose.models.BusinessProfile || mongoose.model('BusinessProfile', businessProfileSchema)

module.exports = { BusinessProfile }
