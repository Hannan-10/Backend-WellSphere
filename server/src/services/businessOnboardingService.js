const { BusinessProfile } = require('../models/BusinessProfile')
const { User } = require('../models/User')
const { httpError } = require('../utils/httpError')
const { sanitizeBusinessProfilePatch } = require('../utils/businessProfileSanitizer')

async function getMyBusinessProfile(userId) {
  const profile = await BusinessProfile.findOne({ userId })
  return profile
}

async function upsertBusinessOnboarding({ userId, role, payload }) {
  if (!userId) throw httpError(401, 'Invalid user')
  if (role !== 1) throw httpError(403, 'Only business users can access business onboarding')

  const patch = sanitizeBusinessProfilePatch(payload)
  const { _completed, ...update } = patch

  const profile = await BusinessProfile.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: { userId },
      $set: update,
    },
    { new: true, upsert: true }
  )

  const userUpdate = {}
  if (_completed) {
    userUpdate.onboardingCompleted = true
    if (!profile.onboardingCompletedAt) {
      profile.onboardingCompletedAt = new Date()
      await profile.save()
    }
  }

  if (Object.keys(userUpdate).length) {
    const updatedUser = await User.findByIdAndUpdate(userId, { $set: userUpdate }, { new: true })
    if (!updatedUser) throw httpError(401, 'Invalid user')
    return { user: updatedUser, businessProfile: profile }
  }

  const user = await User.findById(userId)
  if (!user) throw httpError(401, 'Invalid user')

  return { user, businessProfile: profile }
}

module.exports = { getMyBusinessProfile, upsertBusinessOnboarding }
