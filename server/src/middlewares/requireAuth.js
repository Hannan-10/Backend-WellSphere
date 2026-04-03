const { httpError } = require('../utils/httpError')
const { extractBearerToken } = require('../utils/authHeader')
const tokenService = require('../services/tokenService')

function requireAuth(req, res, next) {
  const token = extractBearerToken(req.headers?.authorization)
  if (!token) return next(httpError(401, 'Missing bearer token'))

  try {
    const payload = tokenService.verifyAccessToken(token)
    req.auth = { userId: String(payload.sub), role: payload.role }
    return next()
  } catch (e) {
    return next(httpError(401, 'Invalid access token'))
  }
}

module.exports = { requireAuth }
