const businessOnboardingService = require('../services/businessOnboardingService')
const { Job } = require('../models/Job')
const { User } = require('../models/User')

const INDUSTRIES = [
  'Wellness & Spa', 'Fitness & Yoga', 'Health & Nutrition', 'Hospitality & Resort',
  'Retreat Center', 'Beauty & Personal Care', 'Holistic Healing',
  'Corporate Wellness', 'Coaching & Mentoring', 'Other',
]

const COMPANY_SIZES = [
  '1–10 employees', '11–25 employees', '25–50 employees',
  '51–100 employees', '100+ employees',
]

const PERKS = [
  {
    category: 'Living & Lifestyle',
    items: [
      { key: 'accommodation', title: 'Staff Accommodation', desc: 'On-site or nearby housing' },
      { key: 'meals', title: 'Daily Meals', desc: 'Staff meals provided' },
      { key: 'nomad', title: 'Digital Nomad Friendly', desc: 'Remote-ready with wifi & co-work' },
    ],
  },
  {
    category: 'Growth & Development',
    items: [
      { key: 'development', title: 'Professional Development', desc: 'Training, CPD & workshops' },
      { key: 'visa', title: 'Visa Sponsorship', desc: 'Work visa & permit support' },
      { key: 'relocation', title: 'Relocation Support', desc: 'Moving & settling assistance' },
      { key: 'progression', title: 'Career Progression', desc: 'Clear growth pathway' },
    ],
  },
  {
    category: 'Health & Wellbeing',
    items: [
      { key: 'gym', title: 'Gym & Fitness Access', desc: 'Free facility use' },
      { key: 'spa', title: 'Spa & Treatment Access', desc: 'Complimentary treatments' },
      { key: 'classes', title: 'Free Classes', desc: 'On-site yoga, pilates etc.' },
    ],
  },
  {
    category: 'Compensation & Rewards',
    items: [
      { key: 'bonus', title: 'Performance Bonus', desc: 'Commission & incentives' },
      { key: 'discounts', title: 'Staff Discounts', desc: 'Discounted services & products' },
      { key: 'team', title: 'Team Activities', desc: 'Retreats & social events' },
    ],
  },
]

const PRESET_ROLES = [
  'Yoga Instructor', 'Spa Therapist', 'Massage Therapist', 'Wellness Retreat Manager',
  'Pilates Instructor', 'Personal Trainer', 'Beauty Therapist', 'Receptionist',
  'Wellness Consultant', 'Nutritionist', 'Ayurvedic Practitioner', 'Sound Healer',
  'Meditation Teacher', 'Fitness Instructor', 'Reformer Pilates Instructor', 'Holistic Therapist',
]

async function getMe(req, res) {
  if (req.auth.role !== 1) {
    res.status(403).json({ message: 'Only business users can access business onboarding' })
    return
  }

  const profile = await businessOnboardingService.getMyBusinessProfile(req.auth.userId)
  res.status(200).json({ success: true, businessProfile: profile ? profile.toPublic() : null })
}

async function upsert(req, res) {
  const result = await businessOnboardingService.upsertBusinessOnboarding({
    userId: req.auth.userId,
    role: req.auth.role,
    payload: req.body,
  })

  res.status(200).json({
    success: true,
    user: result.user.toPublic(),
    businessProfile: result.businessProfile.toPublic(),
  })
}

async function industries(req, res) {
  res.status(200).json({ success: true, industries: INDUSTRIES })
}

async function companySizes(req, res) {
  res.status(200).json({ success: true, companySizes: COMPANY_SIZES })
}

async function perks(req, res) {
  res.status(200).json({ success: true, perks: PERKS })
}

async function roles(req, res) {
  res.status(200).json({ success: true, roles: PRESET_ROLES })
}

async function companyProfile(req, res) {
  if (req.auth.role !== 1) {
    res.status(403).json({ message: 'Only business users can access business profile' })
    return
  }

  const [profile, user, jobs] = await Promise.all([
    businessOnboardingService.getMyBusinessProfile(req.auth.userId),
    User.findById(req.auth.userId),
    Job.find({ createdBy: req.auth.userId }).sort({ createdAt: -1 }).select('jobTitle location country employmentType createdAt applicationStatus'),
  ])

  const positions = jobs.map(j => ({
    id: String(j._id),
    title: j.jobTitle,
    location: j.location,
    country: j.country,
    type: j.employmentType,
    createdAt: j.createdAt,
    applicationStatus: typeof j.applicationStatus === 'number' ? j.applicationStatus : 1,
  }))

  res.status(200).json({
    success: true,
    user: user ? user.toPublic() : null,
    businessProfile: profile ? profile.toPublic() : null,
    positions,
  })
}

module.exports = { getMe, upsert, industries, companySizes, perks, roles, companyProfile }
