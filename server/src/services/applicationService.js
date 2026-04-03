const mongoose = require('mongoose')
const { httpError } = require('../utils/httpError')
const { JobApplication } = require('../models/JobApplication')
const { Job } = require('../models/Job')
const { User } = require('../models/User')
const { isNonEmptyString } = require('../utils/validators')

function formatTimeAgo(date) {
  const ts = date instanceof Date ? date.getTime() : new Date(date).getTime()
  const diffMs = Date.now() - ts
  if (!(diffMs >= 0)) return 'just now'

  const minutes = Math.floor(diffMs / (60 * 1000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`

  const weeks = Math.floor(days / 7)
  return `${weeks} week${weeks === 1 ? '' : 's'} ago`
}

function normalizeStatus(raw) {
  if (typeof raw !== 'string') return null
  const s = raw.trim().toLowerCase()
  if (!s || s === 'all') return null
  if (s === 'submitted') return 'submitted'
  if (s === 'in review' || s === 'in_review' || s === 'review' || s === 'reviewing') return 'in_review'
  if (s === 'interview' || s === 'interviewed') return 'interview'
  if (s === 'declined' || s === 'rejected') return 'declined'
  return null
}

function mapLegacyStatus(status) {
  if (status === 'applied') return 'submitted'
  if (status === 'interviewed') return 'interview'
  if (status === 'rejected') return 'declined'
  return status
}

function buildActivityMessage({ businessName, jobTitle, status }) {
  if (status === 'interview') return `${businessName} invited you to interview for ${jobTitle}`
  if (status === 'in_review') return `${businessName} is reviewing your application`
  if (status === 'submitted') return `Application submitted to ${businessName}`
  if (status === 'declined') return `${businessName} declined your application for ${jobTitle}`
  if (status === 'hired') return `${businessName} updated your application for ${jobTitle}`
  return `${businessName} updated your application`
}

async function getApplicationCounts({ userId }) {
  const rows = await JobApplication.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $project: {
        status: {
          $switch: {
            branches: [
              { case: { $eq: ['$status', 'applied'] }, then: 'submitted' },
              { case: { $eq: ['$status', 'interviewed'] }, then: 'interview' },
              { case: { $eq: ['$status', 'rejected'] }, then: 'declined' },
            ],
            default: '$status',
          },
        },
      },
    },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ])

  const out = { submitted: 0, in_review: 0, interview: 0, declined: 0 }
  for (const r of rows) {
    if (r._id in out) out[r._id] = r.count
  }

  return out
}

async function listApplications({ userId, status }) {
  if (!mongoose.Types.ObjectId.isValid(userId)) throw httpError(401, 'Invalid user')

  const normalizedStatus = normalizeStatus(status)
  const query = { userId }
  if (normalizedStatus) {
    if (normalizedStatus === 'submitted') query.status = { $in: ['submitted', 'applied'] }
    if (normalizedStatus === 'interview') query.status = { $in: ['interview', 'interviewed'] }
    if (normalizedStatus === 'declined') query.status = { $in: ['declined', 'rejected'] }
    if (normalizedStatus === 'in_review') query.status = 'in_review'
  }

  const applications = await JobApplication.find(query)
    .sort({ createdAt: -1 })
    .select('jobId status createdAt updatedAt')

  const jobIds = applications.map(a => a.jobId).filter(Boolean)
  const jobs = await Job.find({ _id: { $in: jobIds } })
    .select('businessName jobTitle employmentType country location image')

  const jobMap = new Map(jobs.map(j => [String(j._id), j]))

  const items = applications
    .map(a => {
      const job = jobMap.get(String(a.jobId))
      if (!job) return null
      return {
        id: String(a._id),
        jobId: String(job._id),
        businessName: job.businessName,
        jobTitle: job.jobTitle,
        employmentType: job.employmentType,
        country: job.country,
        location: job.location,
        image: job.image,
        status: mapLegacyStatus(a.status),
        appliedAt: a.createdAt,
      }
    })
    .filter(Boolean)

  return { applications: items }
}

async function listRecentActivity({ userId, limit = 10 }) {
  if (!mongoose.Types.ObjectId.isValid(userId)) throw httpError(401, 'Invalid user')

  const take = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(50, Number(limit))) : 10

  const applications = await JobApplication.find({ userId })
    .sort({ updatedAt: -1 })
    .limit(take)
    .select('jobId status createdAt updatedAt')

  const jobIds = applications.map(a => a.jobId).filter(Boolean)
  const jobs = await Job.find({ _id: { $in: jobIds } })
    .select('businessName jobTitle')

  const jobMap = new Map(jobs.map(j => [String(j._id), j]))

  const items = applications
    .map(a => {
      const job = jobMap.get(String(a.jobId))
      if (!job) return null

      const normalizedStatus = mapLegacyStatus(a.status)
      const when = a.updatedAt || a.createdAt

      return {
        id: String(a._id),
        jobId: String(job._id),
        message: buildActivityMessage({
          businessName: job.businessName,
          jobTitle: job.jobTitle,
          status: normalizedStatus,
        }),
        timeAgo: formatTimeAgo(when),
        occurredAt: when,
        status: normalizedStatus,
      }
    })
    .filter(Boolean)

  return { recentActivity: items }
}

async function withdrawApplication({ userId, applicationId }) {
  if (!mongoose.Types.ObjectId.isValid(userId)) throw httpError(401, 'Invalid user')
  if (!mongoose.Types.ObjectId.isValid(applicationId)) throw httpError(400, 'Invalid application id')

  const app = await JobApplication.findOne({ _id: applicationId, userId }).select('_id jobId')
  if (!app) throw httpError(404, 'Application not found')

  await JobApplication.deleteOne({ _id: app._id, userId })

  return {
    applicationId: String(app._id),
    jobId: String(app.jobId),
    hasApplied: 0,
    message: 'Application withdrawn',
  }
}

async function sendApplicationEmail({ userId, applicationId, message }) {
  if (!mongoose.Types.ObjectId.isValid(userId)) throw httpError(401, 'Invalid user')
  if (!mongoose.Types.ObjectId.isValid(applicationId)) throw httpError(400, 'Invalid application id')
  if (!isNonEmptyString(message)) throw httpError(400, 'Message is required')

  const app = await JobApplication.findOne({ _id: applicationId, userId }).select('_id jobId')
  if (!app) throw httpError(404, 'Application not found')

  const [job, user] = await Promise.all([
    Job.findById(app.jobId).select('applicationEmail'),
    User.findById(userId).select('email'),
  ])

  if (!job) throw httpError(404, 'Job not found')
  if (!user) throw httpError(401, 'Invalid user')

  return {
    businessEmail: job.applicationEmail,
    userEmail: user.email,
    message: message.trim(),
  }
}

function formatDateDisplay(date) {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return null
  const day = d.getDate()
  const month = d.toLocaleString('en-US', { month: 'short' })
  const year = d.getFullYear()
  return `${day} ${month} ${year}`
}

function statusOrderVal(status) {
  if (status === 'submitted') return 1
  if (status === 'in_review') return 2
  if (status === 'interview') return 3
  if (status === 'declined' || status === 'hired') return 4
  return 1
}

async function getApplicationById({ userId, applicationId }) {
  if (!mongoose.Types.ObjectId.isValid(userId)) throw httpError(401, 'Invalid user')
  if (!mongoose.Types.ObjectId.isValid(applicationId)) throw httpError(400, 'Invalid application id')

  const application = await JobApplication.findOne({ _id: applicationId, userId })
    .select('jobId status coverNote createdAt updatedAt')

  if (!application) throw httpError(404, 'Application not found')

  const job = await Job.findById(application.jobId)
    .select('businessName jobTitle employmentType country location applicationEmail image')

  if (!job) throw httpError(404, 'Job not found')

  const normalizedStatus = mapLegacyStatus(application.status)
  const level = statusOrderVal(normalizedStatus)

  const createdAt = application.createdAt
  const updatedAt = application.updatedAt || application.createdAt

  const progress = [
    { key: 'applied', label: 'Applied', done: 1, date: formatDateDisplay(createdAt) },
    { key: 'in_review', label: 'In Review', done: level >= 2 ? 1 : 0, date: level >= 2 ? formatDateDisplay(updatedAt) : null },
    { key: 'interview', label: 'Interview', done: level >= 3 ? 1 : 0, date: level >= 3 ? formatDateDisplay(updatedAt) : null },
    { key: 'decision', label: 'Decision', done: level >= 4 ? 1 : 0, date: level >= 4 ? formatDateDisplay(updatedAt) : null },
  ]

  const activityTimeline = [
    {
      message: `Application submitted to ${job.businessName}`,
      timeAgo: formatTimeAgo(createdAt),
      occurredAt: createdAt,
      status: 'submitted',
    },
  ]

  if (normalizedStatus !== 'submitted') {
    let msg = `${job.businessName} updated your application`
    if (normalizedStatus === 'in_review') msg = `Your application moved to In Review`
    if (normalizedStatus === 'interview') msg = `${job.businessName} invited you to interview`
    if (normalizedStatus === 'declined') msg = `${job.businessName} declined your application`
    if (normalizedStatus === 'hired') msg = `${job.businessName} updated your application`

    activityTimeline.push({
      message: msg,
      timeAgo: formatTimeAgo(updatedAt),
      occurredAt: updatedAt,
      status: normalizedStatus,
    })
  }

  return {
    application: {
      id: String(application._id),
      jobId: String(job._id),
      businessName: job.businessName,
      jobTitle: job.jobTitle,
      employmentType: job.employmentType,
      country: job.country,
      location: job.location,
      applicationEmail: job.applicationEmail,
      image: job.image,
      status: normalizedStatus,
      coverNote: application.coverNote || '',
      progress,
      activityTimeline,
      appliedAt: createdAt,
      updatedAt,
    },
  }
}

module.exports = {
  listApplications,
  getApplicationCounts,
  listRecentActivity,
  withdrawApplication,
  sendApplicationEmail,
  getApplicationById,
}
