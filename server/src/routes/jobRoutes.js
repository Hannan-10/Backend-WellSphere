const express = require('express')
const jobController = require('../controllers/jobController')
const { requireAuth } = require('../middlewares/requireAuth')

const router = express.Router()

router.get('/saved', requireAuth, jobController.saved)
router.patch('/saved/unsave', requireAuth, jobController.unsave)
router.get('/', requireAuth, jobController.list)
router.get('/:id', requireAuth, jobController.getById)
router.post('/', requireAuth, jobController.create)
router.patch('/:id/engagement', requireAuth, jobController.engagement)
router.patch('/:id/close', requireAuth, jobController.close)

module.exports = router
