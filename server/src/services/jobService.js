const { Job } = require('../models/Job')
const { User } = require('../models/User')
const { JobFavorite } = require('../models/JobFavorite')
const { JobApplication } = require('../models/JobApplication')
const { JobView } = require('../models/JobView')
const { httpError } = require('../utils/httpError')
const { isNonEmptyString, isValidEmail } = require('../utils/validators')
const mongoose = require('mongoose')

function cleanStringArray(val) {
  if (!Array.isArray(val)) return []
  const out = val
    .filter(v => typeof v === 'string')
    .map(v => v.trim())
    .filter(Boolean)
  return Array.from(new Set(out))
}

function toNumberOrNull(val) {
  if (val === null || val === undefined || val === '') return null
  const n = typeof val === 'string' ? Number(val) : val
  return Number.isFinite(n) ? n : null
}

async function createJob({ userId, role, payload }) {
  if (!userId) throw httpError(401, 'Invalid user')
  if (role !== 1) throw httpError(403, 'Only business users can create jobs')

  const user = await User.findById(userId).select('_id role')
  if (!user) throw httpError(401, 'Invalid user')
  if (user.role !== 1) throw httpError(403, 'Only business users can create jobs')

  const businessName = payload?.businessName
  const jobTitle = payload?.jobTitle
  const employmentType = payload?.employmentType
  const country = payload?.country
  const location = payload?.location
  const applicationEmail = payload?.applicationEmail
  const description = payload?.description
  const image = payload?.image ?? payload?.imageUrl ?? payload?.image_url

  if (!isNonEmptyString(businessName)) throw httpError(400, 'businessName is required')
  if (!isNonEmptyString(jobTitle)) throw httpError(400, 'jobTitle is required')
  if (!isNonEmptyString(employmentType)) throw httpError(400, 'employmentType is required')
  if (!isNonEmptyString(country)) throw httpError(400, 'country is required')
  if (!isNonEmptyString(location)) throw httpError(400, 'location is required')
  if (!isValidEmail(applicationEmail)) throw httpError(400, 'Valid applicationEmail is required')
  if (!isNonEmptyString(description)) throw httpError(400, 'description is required')

  const allowedEmployment = ['Part-time', 'Full-time', 'Contract', 'Freelance', 'Seasonal', 'Residency']
  if (!allowedEmployment.includes(employmentType.trim())) {
    throw httpError(400, 'Invalid employmentType')
  }

  const skills = cleanStringArray(payload?.skills)
  const benefits = cleanStringArray(payload?.benefits)

  const salaryMin = toNumberOrNull(payload?.salary?.min)
  const salaryMax = toNumberOrNull(payload?.salary?.max)
  const currency = typeof payload?.salary?.currency === 'string' && payload.salary.currency.trim()
    ? payload.salary.currency.trim()
    : 'USD'

  if (salaryMin !== null && salaryMin < 0) throw httpError(400, 'salary.min must be >= 0')
  if (salaryMax !== null && salaryMax < 0) throw httpError(400, 'salary.max must be >= 0')
  if (salaryMin !== null && salaryMax !== null && salaryMin > salaryMax) {
    throw httpError(400, 'salary.min must be <= salary.max')
  }

  const linksWebsite = typeof payload?.links?.website === 'string' ? payload.links.website.trim() : ''
  const linksInstagram = typeof payload?.links?.instagram === 'string' ? payload.links.instagram.trim() : ''

  const job = await Job.create({
    createdBy: userId,
    businessName: businessName.trim(),
    jobTitle: jobTitle.trim(),
    employmentType: employmentType.trim(),
    country: country.trim(),
    location: location.trim(),
    applicationEmail: applicationEmail.trim().toLowerCase(),
    description: description.trim(),
    skills,
    image: typeof image === 'string' ? image.trim() : '',
    salary: { min: salaryMin, max: salaryMax, currency },
    benefits,
    links: { website: linksWebsite, instagram: linksInstagram },
    applicationStatus: 1,
    closedAt: null,
  })

  return { job }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildQuery({ employmentType, jobTitle, businessName, country, location, q, includeClosed }) {
  const query = {}

  if (!includeClosed) {
    query.$and = query.$and || []
    query.$and.push({ $or: [{ applicationStatus: 1 }, { applicationStatus: { $exists: false } }] })
  }

  if (typeof employmentType === 'string' && employmentType.trim()) {
    query.employmentType = employmentType.trim()
  }

  if (typeof jobTitle === 'string' && jobTitle.trim()) {
    query.jobTitle = new RegExp(escapeRegex(jobTitle.trim()), 'i')
  }

  if (typeof businessName === 'string' && businessName.trim()) {
    query.businessName = new RegExp(escapeRegex(businessName.trim()), 'i')
  }

  if (typeof country === 'string' && country.trim()) {
    query.country = new RegExp(escapeRegex(country.trim()), 'i')
  }

  if (typeof location === 'string' && location.trim()) {
    query.location = new RegExp(escapeRegex(location.trim()), 'i')
  }

  if (typeof q === 'string' && q.trim()) {
    const rx = new RegExp(escapeRegex(q.trim()), 'i')
    query.$and = query.$and || []
    query.$and.push({
      $or: [
        { businessName: rx },
        { jobTitle: rx },
        { location: rx },
        { country: rx },
        { employmentType: rx },
      ],
    })
  }

  return query
}

async function listJobs({ filters }) {
  const query = buildQuery(filters || {})
  const jobs = await Job.find(query).sort({ createdAt: -1 })
  return { jobs }
}

async function getJobById(jobId) {
  if (!mongoose.Types.ObjectId.isValid(jobId)) throw httpError(400, 'Invalid job id')
  const job = await Job.findById(jobId)
  if (!job) throw httpError(404, 'Job not found')
  return { job }
}

async function closeJob({ userId, role, jobId, isClose }) {
  if (!userId) throw httpError(401, 'Invalid user')
  if (role !== 1) throw httpError(403, 'Only business users can close jobs')
  if (!mongoose.Types.ObjectId.isValid(jobId)) throw httpError(400, 'Invalid job id')

  const flag = isClose === true || isClose === 'true' || isClose === 1 || isClose === '1'
  if (!flag) throw httpError(400, 'isClose is required')

  const job = await Job.findOneAndUpdate(
    { _id: jobId, createdBy: userId },
    { $set: { applicationStatus: 0, closedAt: new Date() } },
    { new: true }
  )

  if (!job) throw httpError(404, 'Job not found')
  return { job }
}

async function getDashboardMeta({ userId }) {
  const totalJobsAvailable = await Job.countDocuments({
    $or: [{ applicationStatus: 1 }, { applicationStatus: { $exists: false } }],
  })

  if (!userId) {
    return {
      totalJobsAvailable,
      quickStats: [
        { key: 'saved', count: 0 },
        { key: 'applied', count: 0 },
        { key: 'interviewed', count: 0 },
        { key: 'viewed', count: 0 },
      ],
    }
  }

  const [savedCount, appliedCount, interviewedCount, viewedCount] = await Promise.all([
    JobFavorite.countDocuments({ userId }),
    JobApplication.countDocuments({ userId, status: 'applied' }),
    JobApplication.countDocuments({ userId, status: 'interviewed' }),
    JobView.countDocuments({ userId }),
  ])

  return {
    totalJobsAvailable,
    quickStats: [
      { key: 'saved', count: savedCount },
      { key: 'applied', count: appliedCount },
      { key: 'interviewed', count: interviewedCount },
      { key: 'viewed', count: viewedCount },
    ],
  }
}

async function getFavoritesSet({ userId, jobIds }) {
  if (!userId || !jobIds?.length) return new Set()
  const favorites = await JobFavorite.find({ userId, jobId: { $in: jobIds } }).select('jobId')
  return new Set(favorites.map(f => String(f.jobId)))
}

async function getJobUserFlags({ userId, jobId }) {
  if (!userId) return { isFavourite: 0, hasApplied: 0 }

  const [fav, app] = await Promise.all([
    JobFavorite.findOne({ userId, jobId }).select('_id'),
    JobApplication.findOne({ userId, jobId }).select('_id status'),
  ])

  return {
    isFavourite: fav ? 1 : 0,
    hasApplied: app ? 1 : 0,
    applicationStage: app?.status || null,
  }
}

async function markViewed({ userId, jobId }) {
  if (!userId) return
  await JobView.findOneAndUpdate(
    { userId, jobId },
    { $set: { viewedAt: new Date() }, $setOnInsert: { userId, jobId } },
    { upsert: true }
  )
}

async function setJobEngagement({ userId, jobId, isFavourite, hasApplied, coverNote, cvDocument }) {
  if (!userId) throw httpError(401, 'Invalid user')
  if (!mongoose.Types.ObjectId.isValid(jobId)) throw httpError(400, 'Invalid job id')

  const favFlag = isFavourite === true || isFavourite === 'true' || isFavourite === 1 || isFavourite === '1'
  const favOff = isFavourite === false || isFavourite === 'false' || isFavourite === 0 || isFavourite === '0'

  const applyFlag = hasApplied === true || hasApplied === 'true' || hasApplied === 1 || hasApplied === '1'
  const applyOff = hasApplied === false || hasApplied === 'false' || hasApplied === 0 || hasApplied === '0'

  if (!(favFlag || favOff || applyFlag || applyOff)) {
    throw httpError(400, 'isFavourite or hasApplied is required')
  }

  const job = await Job.findById(jobId).select('_id applicationStatus')
  if (!job) throw httpError(404, 'Job not found')

  if (applyFlag) {
    const open = typeof job.applicationStatus === 'number' ? job.applicationStatus === 1 : true
    if (!open) throw httpError(400, 'Job is closed')
  }

  const ops = []

  if (favFlag) {
    ops.push(
      JobFavorite.updateOne(
        { userId, jobId },
        { $setOnInsert: { userId, jobId } },
        { upsert: true }
      )
    )
  } else if (favOff) {
    ops.push(JobFavorite.deleteOne({ userId, jobId }))
  }

  if (applyFlag) {
    const insert = { userId, jobId, status: 'applied' }
    const set = {
      ...(typeof coverNote === 'string' ? { coverNote: coverNote.trim() } : {}),
      ...(typeof cvDocument === 'string' ? { cvDocument: cvDocument.trim() } : {}),
    }

    ops.push(
      JobApplication.updateOne(
        { userId, jobId },
        {
          $setOnInsert: insert,
          ...(Object.keys(set).length ? { $set: set } : {}),
        },
        { upsert: true }
      )
    )
  } else if (applyOff) {
    ops.push(JobApplication.deleteOne({ userId, jobId }))
  }

  await Promise.all(ops)

  const flags = await getJobUserFlags({ userId, jobId })
  return { flags }
}

async function listSavedJobs({ userId, filters }) {
  if (!userId) throw httpError(401, 'Invalid user')

  const q = typeof filters?.q === 'string' ? filters.q.trim() : ''
  const businessName = typeof filters?.businessName === 'string' ? filters.businessName.trim() : ''
  const jobTitle = typeof filters?.jobTitle === 'string' ? filters.jobTitle.trim() : ''

  const jobQuery = {}
  const hasSearch = Boolean(q || businessName || jobTitle)

  if (businessName) jobQuery.businessName = new RegExp(escapeRegex(businessName), 'i')
  if (jobTitle) jobQuery.jobTitle = new RegExp(escapeRegex(jobTitle), 'i')
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i')
    jobQuery.$or = [
      { businessName: rx },
      { jobTitle: rx },
      { location: rx },
      { country: rx },
      { employmentType: rx },
    ]
  }

  let allowedJobIds = null
  if (hasSearch) {
    const matched = await Job.find(jobQuery).select('_id')
    allowedJobIds = matched.map(j => j._id)
    if (!allowedJobIds.length) {
      const stats = await getSavedJobsStats({ userId })
      return { items: [], stats }
    }
  }

  const favQuery = { userId }
  if (allowedJobIds) favQuery.jobId = { $in: allowedJobIds }

  const favorites = await JobFavorite.find(favQuery).sort({ createdAt: -1 }).select('jobId createdAt')
  const jobIds = favorites.map(f => f.jobId).filter(Boolean)

  const [jobs, applications, stats] = await Promise.all([
    Job.find({ _id: { $in: jobIds } }).select('businessName jobTitle employmentType country location image applicationStatus createdAt'),
    JobApplication.find({ userId, jobId: { $in: jobIds } }).select('jobId status'),
    getSavedJobsStats({ userId }),
  ])

  const jobMap = new Map(jobs.map(j => [String(j._id), j]))
  const appMap = new Map(applications.map(a => [String(a.jobId), a.status]))

  const items = favorites
    .map(f => {
      const job = jobMap.get(String(f.jobId))
      if (!job) return null

      const stage = appMap.get(String(job._id)) || null
      return {
        savedId: String(f._id),
        jobId: String(job._id),
        businessName: job.businessName,
        jobTitle: job.jobTitle,
        employmentType: job.employmentType,
        country: job.country,
        location: job.location,
        image: job.image,
        applicationStatus: typeof job.applicationStatus === 'number' ? job.applicationStatus : 1,
        savedAt: f.createdAt,
        isFavourite: 1,
        hasApplied: stage ? 1 : 0,
        applicationStage: stage,
      }
    })
    .filter(Boolean)

  return { items, stats }
}

async function getSavedJobsStats({ userId }) {
  const now = Date.now()
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)

  const [totalSaved, totalApplied, savedThisWeek, savedJobIds] = await Promise.all([
    JobFavorite.countDocuments({ userId }),
    JobApplication.countDocuments({ userId }),
    JobFavorite.countDocuments({ userId, createdAt: { $gte: weekAgo } }),
    JobFavorite.find({ userId }).select('jobId'),
  ])

  const ids = savedJobIds.map(r => r.jobId).filter(Boolean)
  const appliedInSaved = ids.length
    ? await JobApplication.countDocuments({ userId, jobId: { $in: ids } })
    : 0

  return {
    totalSaved,
    totalApplied,
    savedThisWeek,
    availableApplications: Math.max(0, totalSaved - appliedInSaved),
  }
}

async function unsaveBySavedId({ userId, savedId }) {
  if (!userId) throw httpError(401, 'Invalid user')
  if (!mongoose.Types.ObjectId.isValid(savedId)) throw httpError(400, 'Invalid saved application id')

  const doc = await JobFavorite.findOne({ _id: savedId, userId }).select('_id jobId')
  if (!doc) throw httpError(404, 'Saved application not found')

  await JobFavorite.deleteOne({ _id: doc._id, userId })

  return {
    savedId: String(doc._id),
    jobId: String(doc.jobId),
    isFavourite: 0,
  }
}

module.exports = {
  createJob,
  listJobs,
  getJobById,
  closeJob,
  getDashboardMeta,
  getFavoritesSet,
  getJobUserFlags,
  markViewed,
  setJobEngagement,
  listSavedJobs,
  unsaveBySavedId,
}
