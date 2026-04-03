const { Profile } = require('../models/Profile')
const { User } = require('../models/User')
const { httpError } = require('../utils/httpError')
const { sanitizeProfilePatch } = require('../utils/profileSanitizer')
const { isValidEmail } = require('../utils/validators')

async function getMyProfile(userId) {
  const profile = await Profile.findOne({ userId })
  return profile
}

function hasText(val) {
  return typeof val === 'string' && val.trim().length > 0
}

function hasItems(val) {
  return Array.isArray(val) && val.length > 0
}

function buildProfileStrengthMessage(missingKeys) {
  const labelFor = (k) => {
    if (k === 'yogaCertifications') return 'certifications'
    if (k === 'website') return 'a portfolio'
    if (k === 'profilePhoto') return 'a profile photo'
    if (k === 'bio') return 'a bio'
    if (k === 'skills') return 'skills'
    if (k === 'workTypes') return 'work preferences'
    if (k === 'languages') return 'languages'
    if (k === 'country') return 'a location'
    return null
  }

  const picks = []
  for (const k of ['yogaCertifications', 'website', 'profilePhoto', 'bio', 'skills', 'workTypes', 'languages', 'country']) {
    if (missingKeys.includes(k)) {
      const label = labelFor(k)
      if (label) picks.push(label)
    }
    if (picks.length === 2) break
  }

  if (!picks.length) return 'Your profile looks great.'
  if (picks.length === 1) return `Add ${picks[0]} to stand out to premium employers.`
  return `Add ${picks[0]} and ${picks[1]} to stand out to premium employers.`
}

async function getProfileStrength(userId) {
  if (!userId) throw httpError(400, 'User id is required')

  const [user, profile] = await Promise.all([
    User.findById(userId),
    Profile.findOne({ userId }),
  ])

  if (!user) throw httpError(401, 'Invalid user')

  const firstName = profile?.firstName || user.firstName
  const lastName = profile?.lastName || user.lastName

  const checklist = [
    { key: 'firstName', weight: 10, done: hasText(firstName) },
    { key: 'lastName', weight: 10, done: hasText(lastName) },
    { key: 'country', weight: 10, done: hasText(profile?.country) },
    { key: 'bio', weight: 15, done: hasText(profile?.bio) },
    { key: 'skills', weight: 15, done: hasItems(profile?.skills) },
    { key: 'workTypes', weight: 10, done: hasItems(profile?.workTypes) },
    { key: 'languages', weight: 10, done: hasItems(profile?.languages) },
    { key: 'profilePhoto', weight: 10, done: hasText(profile?.profilePhoto) },
    { key: 'yogaCertifications', weight: 5, done: hasItems(profile?.yogaCertifications) },
    { key: 'website', weight: 5, done: hasText(profile?.website) },
  ]

  const total = checklist.reduce((s, x) => s + x.weight, 0)
  const earned = checklist.reduce((s, x) => s + (x.done ? x.weight : 0), 0)

  const percentage = Math.max(0, Math.min(100, Math.round((earned / total) * 100)))
  const missing = checklist.filter(x => !x.done).map(x => x.key)

  return {
    percentage,
    message: buildProfileStrengthMessage(missing),
    missingFields: missing,
    completed: missing.length === 0,
  }
}

async function upsertOnboardingProfile(userId, payload) {
  const patch = sanitizeProfilePatch(payload)

  const { _completed, ...update } = patch

  const profile = await Profile.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: { userId },
      $set: update,
    },
    { new: true, upsert: true }
  )

  const userUpdate = {}
  if (typeof update.firstName === 'string' && update.firstName.length) userUpdate.firstName = update.firstName
  if (typeof update.lastName === 'string' && update.lastName.length) userUpdate.lastName = update.lastName

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
    return { user: updatedUser, profile }
  }

  const user = await User.findById(userId)
  if (!user) throw httpError(401, 'Invalid user')

  return { user, profile }
}

async function updateMyProfile(userId, payload) {
  if (!userId) throw httpError(400, 'User id is required')

  const patch = sanitizeProfilePatch(payload)
  const { _completed, ...update } = patch
  delete update.onboardingStep
  void _completed

  const userUpdate = {}

  if (typeof payload?.email !== 'undefined') {
    if (!isValidEmail(payload.email)) throw httpError(400, 'Valid email is required')
    userUpdate.email = payload.email.trim().toLowerCase()
  }

  if (typeof update.firstName === 'string' && update.firstName.length) userUpdate.firstName = update.firstName
  if (typeof update.lastName === 'string' && update.lastName.length) userUpdate.lastName = update.lastName

  const profile = await Profile.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: { userId },
      $set: update,
    },
    { new: true, upsert: true }
  )

  if (Object.keys(userUpdate).length) {
    const updatedUser = await User.findByIdAndUpdate(userId, { $set: userUpdate }, { new: true })
    if (!updatedUser) throw httpError(401, 'Invalid user')
    return { user: updatedUser, profile }
  }

  const user = await User.findById(userId)
  if (!user) throw httpError(401, 'Invalid user')

  return { user, profile }
}

async function removeProfilePhoto(userId) {
  if (!userId) throw httpError(400, 'User id is required')

  const profile = await Profile.findOneAndUpdate(
    { userId },
    { $set: { profilePhoto: '' } },
    { new: true, upsert: true }
  )

  const user = await User.findById(userId)
  if (!user) throw httpError(401, 'Invalid user')

  return { user, profile }
}

module.exports = { getMyProfile, getProfileStrength, upsertOnboardingProfile, updateMyProfile, removeProfilePhoto }
