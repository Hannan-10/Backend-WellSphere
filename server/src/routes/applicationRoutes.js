const express = require('express')
const applicationController = require('../controllers/applicationController')
const { requireAuth } = require('../middlewares/requireAuth')

const router = express.Router()

router.get('/', requireAuth, applicationController.list)
router.get('/:id', requireAuth, applicationController.getById)
router.patch('/:id/withdraw', requireAuth, applicationController.withdraw)
router.post('/:id/send-email', requireAuth, applicationController.sendEmail)

module.exports = router
