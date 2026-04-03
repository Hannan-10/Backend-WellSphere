const authService = require('../services/authService')
const { extractBearerToken } = require('../utils/authHeader')
const userService = require('../services/userService')
const profileService = require('../services/profileService')
const socialAuthService = require('../services/socialAuthService')

async function signUp(req, res) {
  const result = await authService.signUp(req.body)
  res.status(201).json({
    success: true,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresIn: result.accessTokenExpiresIn,
    refreshExpiresIn: result.refreshTokenExpiresIn,
    user: result.user.toPublic(),
  })
}

async function signIn(req, res) {
  const result = await authService.signIn(req.body)
  res.status(200).json({
    success: true,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresIn: result.accessTokenExpiresIn,
    refreshExpiresIn: result.refreshTokenExpiresIn,
    user: result.user.toPublic(),
  })
}

async function socialSignIn(req, res) {
  const result = await socialAuthService.socialSignIn(req.body)
  res.status(200).json({
    success: true,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresIn: result.accessTokenExpiresIn,
    refreshExpiresIn: result.refreshTokenExpiresIn,
    user: result.user.toPublic(),
  })
}

async function refresh(req, res) {
  const accessToken = extractBearerToken(req.headers?.authorization)
  const result = await authService.refresh({ ...req.body, accessToken })
  res.status(200).json({
    success: true,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresIn: result.accessTokenExpiresIn,
    refreshExpiresIn: result.refreshTokenExpiresIn,
    user: result.user.toPublic(),
  })
}

async function resetPassword(req, res) {
  const result = await authService.resetPassword(req.body)
  res.status(200).json({ success: true, ...result })
}

async function logout(req, res) {
  const result = await authService.logout({ userId: req.auth.userId })
  res.status(200).json({ success: true, ...result })
}

async function deleteAccount(req, res) {
  const result = await userService.deleteAccountById(req.auth.userId)
  res.status(200).json({ success: true, ...result })
}

async function profileStrength(req, res) {
  const result = await profileService.getProfileStrength(req.auth.userId)
  res.status(200).json({ success: true, ...result })
}

module.exports = { signUp, signIn, socialSignIn, refresh, resetPassword, logout, deleteAccount, profileStrength }
