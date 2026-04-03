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
  const n = typeof val === 'string' ? Number(val) : val
  if (!Number.isFinite(n)) return null
  const i = Math.trunc(n)
  if (i < 0 || i > 5) return null
  return i
}

function cleanCompleted(val) {
  if (val === true || val === 'true' || val === 1 || val === '1') return true
  return false
}

function sanitizeBusinessProfilePatch(payload) {
  const patch = {}

  const companyName = cleanString(payload?.companyName ?? payload?.businessName)
  const industry = cleanString(payload?.industry)
  const companySize = cleanString(payload?.companySize)
  const country = cleanString(payload?.country)
  const city = cleanString(payload?.city ?? payload?.location)
  const companyLogo = cleanString(payload?.companyLogo ?? payload?.logo ?? payload?.logoUrl)

  const about = cleanString(payload?.about)
  const mission = cleanString(payload?.mission)
  const foundedYear = cleanString(payload?.foundedYear)
  const website = cleanString(payload?.website)

  const perks = cleanStringArray(payload?.perks)
  const openRoles = cleanStringArray(payload?.openRoles)
  const languages = cleanStringArray(payload?.languages)
  const instagram = cleanString(payload?.instagram)
  const linkedin = cleanString(payload?.linkedin)
  const website2 = cleanString(payload?.website2)

  if (companyName !== null) patch.companyName = companyName
  if (industry !== null) patch.industry = industry
  if (companySize !== null) patch.companySize = companySize
  if (country !== null) patch.country = country
  if (city !== null) patch.city = city
  if (companyLogo !== null) patch.companyLogo = companyLogo

  if (about !== null) patch.about = about
  if (mission !== null) patch.mission = mission
  if (foundedYear !== null) patch.foundedYear = foundedYear
  if (website !== null) patch.website = website

  if (perks !== null) patch.perks = perks
  if (openRoles !== null) patch.openRoles = openRoles
  if (languages !== null) patch.languages = languages
  if (instagram !== null) patch.instagram = instagram
  if (linkedin !== null) patch.linkedin = linkedin
  if (website2 !== null) patch.website2 = website2

  const step = cleanStep(payload?.step ?? payload?.onboardingStep)
  if (step !== null) patch.onboardingStep = step

  patch._completed = cleanCompleted(payload?.completed)

  return patch
}

module.exports = { sanitizeBusinessProfilePatch }
