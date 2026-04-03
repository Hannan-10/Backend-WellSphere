const express = require('express')
const supportController = require('../controllers/supportController')
const { extractBearerToken } = require('../utils/authHeader')
const tokenService = require('../services/tokenService')
const { requireAuth } = require('../middlewares/requireAuth')

const router = express.Router()

function maybeAuth(req, res, next) {
  const token = extractBearerToken(req.headers?.authorization)
  if (!token) return next()
  try {
    const payload = tokenService.verifyAccessToken(token)
    req.auth = { userId: String(payload.sub), role: payload.role }
  } catch (_err) {
    void _err
  }
  return next()
}

router.post('/contact', maybeAuth, supportController.contact)
router.post('/send-mail', maybeAuth, supportController.sendMail)
router.get('/tickets', requireAuth, supportController.tickets)
router.patch('/tickets/:id/resolve', requireAuth, supportController.resolve)
router.get('/mailto', supportController.mailto)

module.exports = router
