const { RefreshToken } = require('../models/RefreshToken')
const { User } = require('../models/User')
const { getAuthConfig } = require('../config/auth')
const { durationToSeconds } = require('../utils/duration')
const { httpError } = require('../utils/httpError')
const tokenService = require('./tokenService')

async function createSession(user) {
  const { accessTokenExpiresIn, refreshTokenExpiresIn } = getAuthConfig()

  const accessTokenExpiresInSeconds = durationToSeconds(accessTokenExpiresIn)
  const refreshTokenExpiresInSeconds = durationToSeconds(refreshTokenExpiresIn)

  if (!accessTokenExpiresInSeconds) throw httpError(500, 'Invalid JWT_ACCESS_EXPIRES_IN')
  if (!refreshTokenExpiresInSeconds) throw httpError(500, 'Invalid JWT_REFRESH_EXPIRES_IN')

  const refreshJti = tokenService.newJti()
  const refreshExpiresAt = new Date(Date.now() + refreshTokenExpiresInSeconds * 1000)

  await RefreshToken.create({
    userId: user._id,
    jti: refreshJti,
    expiresAt: refreshExpiresAt,
  })

  return {
    accessToken: tokenService.signAccessToken(user),
    refreshToken: tokenService.signRefreshToken(user, refreshJti),
    expiresIn: accessTokenExpiresInSeconds,
    refreshExpiresIn: refreshTokenExpiresInSeconds,
  }
}

async function refreshSession(refreshToken) {
  if (typeof refreshToken !== 'string' || refreshToken.trim().length === 0) {
    throw httpError(400, 'Refresh token is required')
  }

  let payload
  try {
    payload = tokenService.verifyRefreshToken(refreshToken)
  } catch (e) {
    throw httpError(401, 'Invalid refresh token')
  }

  if (payload?.type !== 'refresh') throw httpError(401, 'Invalid refresh token')
  if (!payload?.sub || !payload?.jti) throw httpError(401, 'Invalid refresh token')

  const stored = await RefreshToken.findOne({ jti: payload.jti, userId: payload.sub })
  if (!stored || !stored.isActive()) throw httpError(401, 'Invalid refresh token')

  stored.revokedAt = new Date()
  await stored.save()

  const user = await User.findById(payload.sub)
  if (!user) throw httpError(401, 'Invalid refresh token')

  const session = await createSession(user)

  return { user, ...session }
}

async function refreshSessionWithAccess(refreshToken, accessToken) {
  if (typeof accessToken === 'string' && accessToken.trim().length > 0) {
    let accessPayload
    try {
      accessPayload = tokenService.verifyAccessToken(accessToken.trim(), { ignoreExpiration: true })
    } catch (e) {
      throw httpError(401, 'Invalid access token')
    }

    if (!accessPayload?.sub) throw httpError(401, 'Invalid access token')

    let refreshPayload
    try {
      refreshPayload = tokenService.verifyRefreshToken(refreshToken)
    } catch (e) {
      throw httpError(401, 'Invalid refresh token')
    }

    if (String(accessPayload.sub) !== String(refreshPayload.sub)) {
      throw httpError(401, 'Token user mismatch')
    }
  }

  return refreshSession(refreshToken)
}

module.exports = { createSession, refreshSession, refreshSessionWithAccess }
