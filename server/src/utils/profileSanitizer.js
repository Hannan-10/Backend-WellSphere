function cleanString(val) {
  if (typeof val !== 'string') return null
  const s = val.trim()
  return s.length ? s : ''
}

function cleanStringArray(val) {
  if (!Array.isArray(val)) return null
  const out = val
    .filter(v => typeof v === 'string')
    .map(v => v.trim())
    .filter(Boolean)
  return Array.from(new Set(out))
}

function cleanStep(val) {
  if (val === null || val === undefined) return null
  const n = typeof val === 'string' ? Number(val) : val
  if (!Number.isFinite(n)) return null
  return Math.max(0, Math.min(4, Math.floor(n)))
}

function sanitizeProfilePatch(payload) {
  const patch = {}

  const firstName = cleanString(payload?.firstName)
  const lastName = cleanString(payload?.lastName)
  const country = cleanString(payload?.country ?? payload?.location)
  const profilePhoto = cleanString(payload?.profilePhoto ?? payload?.profilePhotoUrl)
  const coverPhoto = cleanString(payload?.coverPhoto ?? payload?.coverPhotoUrl ?? payload?.coverUrl)

  const bio = cleanString(payload?.bio)
  const yearsOfExperience = cleanString(payload?.yearsOfExperience ?? payload?.experience)
  const website = cleanString(payload?.website)

  const skills = cleanStringArray(payload?.skills)
  const otherSkills = cleanStringArray(payload?.otherSkills)
  const yogaCertifications = cleanStringArray(payload?.yogaCertifications ?? payload?.certifications)

  const workTypes = cleanStringArray(payload?.workTypes)
  const languages = cleanStringArray(payload?.languages)
  const instagram = cleanString(payload?.instagram)
  const linkedin = cleanString(payload?.linkedin)
  const youtube = cleanString(payload?.youtube)

  if (firstName !== null) patch.firstName = firstName
  if (lastName !== null) patch.lastName = lastName
  if (country !== null) patch.country = country
  if (profilePhoto !== null) patch.profilePhoto = profilePhoto
  if (coverPhoto !== null) patch.coverPhoto = coverPhoto
  if (bio !== null) patch.bio = bio
  if (yearsOfExperience !== null) patch.yearsOfExperience = yearsOfExperience
  if (website !== null) patch.website = website
  if (skills !== null) patch.skills = skills
  if (otherSkills !== null) patch.otherSkills = otherSkills
  if (yogaCertifications !== null) patch.yogaCertifications = yogaCertifications
  if (workTypes !== null) patch.workTypes = workTypes
  if (languages !== null) patch.languages = languages
  if (instagram !== null) patch.instagram = instagram
  if (linkedin !== null) patch.linkedin = linkedin
  if (youtube !== null) patch.youtube = youtube

  const step = cleanStep(payload?.onboardingStep ?? payload?.step)
  if (step !== null) patch.onboardingStep = step

  const completed = payload?.onboardingCompleted ?? payload?.completed
  patch._completed = completed === true || completed === 'true'

  return patch
}

module.exports = { sanitizeProfilePatch }
