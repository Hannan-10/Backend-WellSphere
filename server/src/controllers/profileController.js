const profileService = require('../services/profileService')
const { User } = require('../models/User')

function buildCountries() {
  try {
    const countries = require('i18n-iso-countries')
    const en = require('i18n-iso-countries/langs/en.json')
    countries.registerLocale(en)

    const list = Object.entries(countries.getNames('en')).map(([code, name]) => ({
      value: code,
      label: name,
    }))
      .filter(x => x.value && x.label)
      .sort((a, b) => a.label.localeCompare(b.label))

    list.push({ value: 'OTHER', label: 'Other' })
    return list
  } catch (_err) {
    void _err
    return [{ value: 'OTHER', label: 'Other' }]
  }
}

const COUNTRIES = buildCountries()

const EXPERIENCE_OPTIONS = [
  { value: 'less-than-1', label: 'Less than 1 year' },
  { value: '1-3', label: '1–3 years' },
  { value: '3-5', label: '3–5 years' },
  { value: '5-10', label: '5–10 years' },
  { value: '10+', label: '10+ years' },
]

const YOGA_CERTS = ['RYT 200', 'RYT 500', 'E-RYT 200', 'E-RYT 500']

const WORK_TYPES = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'seasonal', label: 'Seasonal' },
  { value: 'retreat-based', label: 'Retreat-based' },
  { value: 'remote', label: 'Remote' },
]

const SKILL_CATEGORIES = [
  { label: 'Yoga', skills: ['Vinyasa', 'Hatha', 'Ashtanga', 'Yin', 'Restorative', 'Kundalini', 'Prenatal Yoga', 'Kids Yoga', 'Aerial Yoga'] },
  { label: 'Pilates & Movement', skills: ['Pilates', 'Reformer Pilates', 'Mat Pilates', 'Barre', 'Functional Training'] },
  { label: 'Mindfulness & Healing', skills: ['Meditation', 'Breathwork', 'Sound Healing', 'Reiki', 'Ayurveda', 'Holistic Therapy'] },
  { label: 'Massage & Bodywork', skills: ['Massage Therapy', 'Deep Tissue', 'Thai Massage', 'Sports Massage'] },
  { label: 'Spa, Beauty & Wellness', skills: ['Spa & Wellness', 'Beauty Therapy', 'Nutrition', 'Health Coaching', 'Life Coaching'] },
  { label: 'Clinical & Allied Health', skills: ['Physiotherapy', 'Osteopathy', 'Acupuncture', 'TCM'] },
  { label: 'Management & Hospitality', skills: ['Retreat Management', 'Spa Management', 'Reception', 'Hospitality'] },
  { label: 'Marketing & Content', skills: ['UGC Creation', 'Content Creation', 'Social Media Management', 'Marketing', 'Digital Marketing', 'Email Marketing', 'Brand Strategy', 'Photography', 'Videography', 'Copywriting'] },
]

async function getMe(req, res) {
  const profile = await profileService.getMyProfile(req.auth.userId)
  const user = await User.findById(req.auth.userId)
  res.status(200).json({
    success: true,
    user: user ? user.toPublic() : null,
    profile: profile ? profile.toPublic() : null,
  })
}

async function upsertOnboarding(req, res) {
  const result = await profileService.upsertOnboardingProfile(req.auth.userId, req.body)
  res.status(200).json({
    success: true,
    user: result.user.toPublic(),
    profile: result.profile.toPublic(),
  })
}

async function updateMe(req, res) {
  const result = await profileService.updateMyProfile(req.auth.userId, req.body)
  res.status(200).json({
    success: true,
    user: result.user.toPublic(),
    profile: result.profile.toPublic(),
  })
}

async function removePhoto(req, res) {
  const result = await profileService.removeProfilePhoto(req.auth.userId)
  res.status(200).json({
    success: true,
    user: result.user.toPublic(),
    profile: result.profile.toPublic(),
  })
}

async function listCountries(req, res) {
  res.status(200).json({ success: true, countries: COUNTRIES })
}

async function listExperienceOptions(req, res) {
  res.status(200).json({ success: true, experienceOptions: EXPERIENCE_OPTIONS })
}

async function listSkillCategories(req, res) {
  res.status(200).json({
    success: true,
    skillCategories: SKILL_CATEGORIES.map(cat => ({
      label: cat.label,
      skills: cat.skills.map(label => ({ label })),
    })),
  })
}

async function listYogaCertifications(req, res) {
  res.status(200).json({ success: true, yogaCertifications: YOGA_CERTS })
}

async function listWorkTypes(req, res) {
  res.status(200).json({ success: true, workTypes: WORK_TYPES })
}

module.exports = {
  getMe,
  upsertOnboarding,
  updateMe,
  removePhoto,
  listCountries,
  listExperienceOptions,
  listSkillCategories,
  listYogaCertifications,
  listWorkTypes,
}
