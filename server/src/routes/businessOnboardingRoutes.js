const express = require('express')
const businessOnboardingController = require('../controllers/businessOnboardingController')
const { requireAuth } = require('../middlewares/requireAuth')

const router = express.Router()

router.get('/industries', businessOnboardingController.industries)
router.get('/company-sizes', businessOnboardingController.companySizes)
router.get('/perks', businessOnboardingController.perks)
router.get('/roles', businessOnboardingController.roles)
router.get('/company-profile', requireAuth, businessOnboardingController.companyProfile)
router.get('/me', requireAuth, businessOnboardingController.getMe)
router.patch('/', requireAuth, businessOnboardingController.upsert)

module.exports = router
