const mongoose = require('mongoose')

const profileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true, index: true },

    firstName: { type: String, trim: true, default: '' },
    lastName: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },
    profilePhoto: { type: String, trim: true, default: '' },
    coverPhoto: { type: String, trim: true, default: '' },

    bio: { type: String, trim: true, default: '' },
    yearsOfExperience: { type: String, trim: true, default: '' },
    website: { type: String, trim: true, default: '' },

    skills: { type: [String], default: [] },
    otherSkills: { type: [String], default: [] },
    yogaCertifications: { type: [String], default: [] },

    workTypes: { type: [String], default: [] },
    languages: { type: [String], default: [] },
    instagram: { type: String, trim: true, default: '' },
    linkedin: { type: String, trim: true, default: '' },
    youtube: { type: String, trim: true, default: '' },

    onboardingStep: { type: Number, default: 0 },
    onboardingCompletedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

profileSchema.methods.toPublic = function toPublic() {
  return {
    id: String(this._id),
    userId: String(this.userId),
    firstName: this.firstName,
    lastName: this.lastName,
    country: this.country,
    profilePhoto: this.profilePhoto,
    coverPhoto: this.coverPhoto,
    bio: this.bio,
    yearsOfExperience: this.yearsOfExperience,
    website: this.website,
    skills: this.skills,
    otherSkills: this.otherSkills,
    yogaCertifications: this.yogaCertifications,
    workTypes: this.workTypes,
    languages: this.languages,
    instagram: this.instagram,
    linkedin: this.linkedin,
    youtube: this.youtube,
    onboardingStep: this.onboardingStep,
    onboardingCompletedAt: this.onboardingCompletedAt,
  }
}

const Profile = mongoose.models.Profile || mongoose.model('Profile', profileSchema)

module.exports = { Profile }
