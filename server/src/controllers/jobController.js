const jobService = require('../services/jobService')

async function create(req, res) {
  const result = await jobService.createJob({ userId: req.auth.userId, role: req.auth.role, payload: req.body })
  res.status(201).json({ success: true, job: result.job.toPublic() })
}

async function list(req, res) {
  const userId = req.auth?.userId

  const result = await jobService.listJobs({
    filters: {
      employmentType: req.query?.employmentType,
      jobTitle: req.query?.jobTitle,
      businessName: req.query?.businessName,
      country: req.query?.country,
      location: req.query?.location ?? req.query?.city,
      q: req.query?.q,
      includeClosed: req.query?.includeClosed === 'true' || req.query?.includeClosed === '1',
    },
  })

  const jobIds = result.jobs.map(j => j._id)
  const [meta, favSet] = await Promise.all([
    jobService.getDashboardMeta({ userId }),
    jobService.getFavoritesSet({ userId, jobIds }),
  ])

  const items = result.jobs.map(j => ({
    id: String(j._id),
    businessName: j.businessName,
    jobTitle: j.jobTitle,
    employmentType: j.employmentType,
    country: j.country,
    location: j.location,
    image: j.image,
    createdAt: j.createdAt,
    applicationStatus: typeof j.applicationStatus === 'number' ? j.applicationStatus : 1,
    isFavourite: favSet.has(String(j._id)) ? 1 : 0,
  }))

  res.status(200).json({
    success: true,
    totalJobsAvailable: meta.totalJobsAvailable,
    quickStats: meta.quickStats,
    jobs: items,
  })
}

async function getById(req, res) {
  const userId = req.auth?.userId
  const result = await jobService.getJobById(req.params.id)

  const flags = await jobService.getJobUserFlags({ userId, jobId: result.job._id })
  await jobService.markViewed({ userId, jobId: result.job._id })

  res.status(200).json({
    success: true,
    job: {
      ...result.job.toPublic(),
      isFavourite: flags.isFavourite,
      hasApplied: flags.hasApplied,
      applicationStage: flags.applicationStage,
    },
  })
}

async function close(req, res) {
  const result = await jobService.closeJob({
    userId: req.auth.userId,
    role: req.auth.role,
    jobId: req.params.id,
    isClose: req.body?.isClose ?? req.body?.isClosed ?? req.body?.close,
  })
  res.status(200).json({ success: true, job: result.job.toPublic() })
}

async function engagement(req, res) {
  const result = await jobService.setJobEngagement({
    userId: req.auth.userId,
    jobId: req.params.id,
    isFavourite: req.body?.isFavourite ?? req.body?.favorite ?? req.body?.favourite,
    hasApplied: req.body?.hasApplied ?? req.body?.applied,
    coverNote: req.body?.coverNote ?? req.body?.cover_note ?? req.body?.message,
    cvDocument: req.body?.cvDocument ?? req.body?.cv ?? req.body?.document,
  })

  res.status(200).json({ success: true, ...result.flags })
}

async function saved(req, res) {
  const result = await jobService.listSavedJobs({
    userId: req.auth.userId,
    filters: {
      q: req.query?.q,
      businessName: req.query?.businessName,
      jobTitle: req.query?.jobTitle,
    },
  })

  res.status(200).json({
    success: true,
    totalSaved: result.stats.totalSaved,
    totalApplied: result.stats.totalApplied,
    savedThisWeek: result.stats.savedThisWeek,
    availableApplications: result.stats.availableApplications,
    savedRoles: result.items,
  })
}

async function unsave(req, res) {
  const result = await jobService.unsaveBySavedId({
    userId: req.auth.userId,
    savedId: req.body?.savedId ?? req.body?.savedApplicationId ?? req.body?.id,
  })

  res.status(200).json({ success: true, ...result })
}

module.exports = { create, list, getById, close, engagement, saved, unsave }
