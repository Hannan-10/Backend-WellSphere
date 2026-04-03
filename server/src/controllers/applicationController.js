const applicationService = require('../services/applicationService')

async function list(req, res) {
  const counts = await applicationService.getApplicationCounts({ userId: req.auth.userId })
  const result = await applicationService.listApplications({ userId: req.auth.userId, status: req.query?.status })
  const activity = await applicationService.listRecentActivity({ userId: req.auth.userId, limit: req.query?.activityLimit })
  const totalApplied = Object.values(counts).reduce((a, b) => a + b, 0)

  res.status(200).json({
    success: true,
    totalApplied,
    counts: {
      submitted: counts.submitted,
      inReview: counts.in_review,
      interview: counts.interview,
      declined: counts.declined,
    },
    applications: result.applications,
    recentActivity: activity.recentActivity,
  })
}

async function withdraw(req, res) {
  const result = await applicationService.withdrawApplication({
    userId: req.auth.userId,
    applicationId: req.params.id,
  })
  res.status(200).json({ success: true, ...result })
}

async function sendEmail(req, res) {
  const result = await applicationService.sendApplicationEmail({
    userId: req.auth.userId,
    applicationId: req.params.id,
    message: req.body?.message,
  })
  res.status(200).json({ success: true, ...result })
}

async function getById(req, res) {
  const result = await applicationService.getApplicationById({
    userId: req.auth.userId,
    applicationId: req.params.id,
  })
  res.status(200).json({ success: true, ...result })
}

module.exports = { list, withdraw, sendEmail, getById }
