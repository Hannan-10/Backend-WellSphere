const express = require('express')
const cors = require('cors')
const authRoutes = require('./routes/authRoutes')
const profileRoutes = require('./routes/profileRoutes')
const jobRoutes = require('./routes/jobRoutes')
const applicationRoutes = require('./routes/applicationRoutes')
const supportRoutes = require('./routes/supportRoutes')
const businessOnboardingRoutes = require('./routes/businessOnboardingRoutes')
const { notFound } = require('./middlewares/notFound')
const { errorHandler } = require('./middlewares/errorHandler')

function createApp() {
  const app = express()

  app.use(cors())
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))

  app.get('/', (req, res) => {
    res.send('API Running')
  })

  app.use('/api/auth', authRoutes)
  app.use('/api/profile', profileRoutes)
  app.use('/api/business-onboarding', businessOnboardingRoutes)
  app.use('/api/jobs', jobRoutes)
  app.use('/api/applications', applicationRoutes)
  app.use('/api/support', supportRoutes)

  app.use(notFound)
  app.use(errorHandler)

  return app
}

module.exports = { createApp }
