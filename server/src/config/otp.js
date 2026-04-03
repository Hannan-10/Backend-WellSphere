const { httpError } = require('../utils/httpError')

function getOtpConfig() {
  const expiresInSecondsRaw = process.env.OTP_EXPIRES_IN_SECONDS
  const expiresInSeconds = expiresInSecondsRaw ? Number(expiresInSecondsRaw) : 60

  if (!Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0) {
    throw httpError(500, 'OTP_EXPIRES_IN_SECONDS must be a positive number')
  }

  return { expiresInSeconds: Math.floor(expiresInSeconds) }
}

module.exports = { getOtpConfig }
