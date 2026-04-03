const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const { getAuthConfig } = require('../config/auth')

function newJti() {
  return crypto.randomUUID()
}

function signAccessToken(user) {
  const { accessTokenSecret, accessTokenExpiresIn } = getAuthConfig()
  return jwt.sign(
    { sub: String(user._id), role: user.role },
    accessTokenSecret,
    { expiresIn: accessTokenExpiresIn }
  )
}

function signRefreshToken(user, jti) {
  const { refreshTokenSecret, refreshTokenExpiresIn } = getAuthConfig()
  return jwt.sign(
    { sub: String(user._id), jti, type: 'refresh' },
    refreshTokenSecret,
    { expiresIn: refreshTokenExpiresIn }
  )
}

function verifyRefreshToken(refreshToken) {
  const { refreshTokenSecret } = getAuthConfig()
  return jwt.verify(refreshToken, refreshTokenSecret)
}

function verifyAccessToken(accessToken, options = {}) {
  const { accessTokenSecret } = getAuthConfig()
  return jwt.verify(accessToken, accessTokenSecret, {
    ignoreExpiration: Boolean(options.ignoreExpiration),
  })
}

module.exports = { newJti, signAccessToken, signRefreshToken, verifyRefreshToken, verifyAccessToken }
