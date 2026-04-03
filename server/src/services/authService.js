const { User } = require('../models/User')
const { Otp } = require('../models/Otp')
const { RefreshToken } = require('../models/RefreshToken')
const { httpError } = require('../utils/httpError')
const { isNonEmptyString, isValidEmail, parseRole } = require('../utils/validators')
const { hashPassword, verifyPassword } = require('./passwordService')
const sessionService = require('./sessionService')
const { getOtpConfig } = require('../config/otp')

async function signUp(payload) {
  const role = parseRole(payload?.role)
  const firstName = payload?.firstName
  const lastName = payload?.lastName
  const email = payload?.email
  const password = payload?.password ?? payload?.pwd

  if (role === null) throw httpError(400, 'Invalid role')
  if (!isNonEmptyString(firstName)) throw httpError(400, 'First name is required')
  if (!isNonEmptyString(lastName)) throw httpError(400, 'Last name is required')
  if (!isValidEmail(email)) throw httpError(400, 'Valid email is required')
  if (!isNonEmptyString(password) || password.trim().length < 8) {
    throw httpError(400, 'Password must be at least 8 characters')
  }

  const existing = await User.findOne({ email: email.trim().toLowerCase() }).select('_id')
  if (existing) throw httpError(409, 'Email is already in use')

  const passwordHash = await hashPassword(password.trim())
  const user = await User.create({
    role,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.trim().toLowerCase(),
    passwordHash,
  })

  const session = await sessionService.createSession(user)

  return {
    user,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    accessTokenExpiresIn: session.expiresIn,
    refreshTokenExpiresIn: session.refreshExpiresIn,
  }
}

async function signIn(payload) {
  const email = payload?.email
  const password = payload?.password ?? payload?.pwd

  if (!isValidEmail(email)) throw httpError(400, 'Valid email is required')
  if (!isNonEmptyString(password)) throw httpError(400, 'Password is required')

  const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash')
  if (!user) throw httpError(401, 'Invalid email or password')
  if (!user.passwordHash) throw httpError(401, 'Password sign-in not available for this account')

  const ok = await verifyPassword(password.trim(), user.passwordHash)
  if (!ok) throw httpError(401, 'Invalid email or password')

  const session = await sessionService.createSession(user)

  return {
    user,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    accessTokenExpiresIn: session.expiresIn,
    refreshTokenExpiresIn: session.refreshExpiresIn,
  }
}

async function refresh(payload) {
  const refreshToken = payload?.refreshToken ?? payload?.token
  const accessToken = payload?.accessToken
  const result = await sessionService.refreshSessionWithAccess(refreshToken, accessToken)

  return {
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    accessTokenExpiresIn: result.expiresIn,
    refreshTokenExpiresIn: result.refreshExpiresIn,
  }
}

async function resetPassword(payload) {
  const email = payload?.email
  const newPassword = payload?.password ?? payload?.newPassword ?? payload?.pwd

  if (!isValidEmail(email)) throw httpError(400, 'Valid email is required')
  if (!isNonEmptyString(newPassword) || newPassword.trim().length < 8) {
    throw httpError(400, 'Password must be at least 8 characters')
  }

  const normalizedEmail = email.trim().toLowerCase()
  const { expiresInSeconds } = getOtpConfig()

  const lastVerified = await Otp.findOne({
    email: normalizedEmail,
    purpose: 'forgot_password',
    consumedAt: { $ne: null },
  }).sort({ consumedAt: -1 })

  if (!lastVerified) throw httpError(401, 'OTP verification required')

  const ageMs = Date.now() - new Date(lastVerified.consumedAt).getTime()
  if (!(ageMs >= 0 && ageMs <= expiresInSeconds * 1000)) {
    throw httpError(401, 'OTP verification required')
  }

  const passwordHash = await hashPassword(newPassword.trim())

  const user = await User.findOneAndUpdate(
    { email: normalizedEmail },
    { $set: { passwordHash } },
    { new: true }
  )

  if (!user) throw httpError(404, 'User not found')

  await RefreshToken.updateMany(
    { userId: user._id, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  )

  return { message: 'Password reset successful' }
}

async function logout({ userId }) {
  if (!isNonEmptyString(userId)) throw httpError(400, 'User id is required')

  await RefreshToken.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  )

  return { message: 'Logged out' }
}

module.exports = { signUp, signIn, refresh, resetPassword, logout }
