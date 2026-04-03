const otpService = require('../services/otpService')
const { httpError } = require('../utils/httpError')

async function sendOtp(req, res) {
  const result = await otpService.sendOtp(req.body)
  res.status(200).json({
    success: true,
    email: result.email,
    otp: result.otp,
    expiresIn: result.expiresIn,
    mail: result.mail,
  })
}

async function sendForgotPasswordOtp(req, res) {
  const flag = req.body?.forgotPassword ?? req.body?.isForgotPassword ?? req.body?.forgot_password ?? req.body?.flag
  const ok =
    flag === true ||
    flag === 'true' ||
    flag === 1 ||
    flag === '1' ||
    flag === 'forgot_password'

  if (!ok) throw httpError(400, 'forgotPassword flag is required')

  const result = await otpService.issueOtp({ email: req.body?.email, purpose: 'forgot_password' })
  res.status(200).json({ success: true, ...result })
}

async function verifyForgotPasswordOtp(req, res) {
  const result = await otpService.verifyOtp({
    email: req.body?.email,
    otp: req.body?.otp,
    purpose: 'forgot_password',
  })
  res.status(200).json({ success: true, ...result })
}

async function verifyOtpAuth(req, res) {
  const result = await otpService.verifyOtp({
    email: req.body?.email,
    otp: req.body?.otp,
    purpose: 'auth',
  })
  res.status(200).json({ success: true, email: result.email, verified: result.verified })
}

module.exports = { sendOtp, sendForgotPasswordOtp, verifyForgotPasswordOtp, verifyOtpAuth }
