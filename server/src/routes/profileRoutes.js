const express = require('express')
const profileController = require('../controllers/profileController')
const { requireAuth } = require('../middlewares/requireAuth')

const router = express.Router()

router.get('/options/countries', profileController.listCountries)
router.get('/options/experience', profileController.listExperienceOptions)
router.get('/options/skill-categories', profileController.listSkillCategories)
router.get('/options/yoga-certs', profileController.listYogaCertifications)
router.get('/options/work-types', profileController.listWorkTypes)

router.get('/me', requireAuth, profileController.getMe)
router.patch('/onboarding', requireAuth, profileController.upsertOnboarding)
router.patch('/me', requireAuth, profileController.updateMe)
router.delete('/photo', requireAuth, profileController.removePhoto)

module.exports = router
