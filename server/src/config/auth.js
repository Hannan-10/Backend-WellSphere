const { httpError } = require('../utils/httpError')

function getAuthConfig() {
  const fallbackSecret = process.env.JWT_SECRET
  const accessTokenSecret = process.env.JWT_ACCESS_SECRET || fallbackSecret
  const refreshTokenSecret = process.env.JWT_REFRESH_SECRET || fallbackSecret

  if (!accessTokenSecret) throw httpError(500, 'JWT_ACCESS_SECRET is required')
  if (!refreshTokenSecret) throw httpError(500, 'JWT_REFRESH_SECRET is required')

  const accessTokenExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '15m'
  const refreshTokenExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '24h'

  return {
    accessTokenSecret,
    refreshTokenSecret,
    accessTokenExpiresIn,
    refreshTokenExpiresIn,
  }
}

module.exports = { getAuthConfig }
