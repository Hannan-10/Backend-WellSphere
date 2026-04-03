const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const { Otp } = require('../models/Otp')
const { getOtpConfig } = require('../config/otp')
const { httpError } = require('../utils/httpError')
const { isNonEmptyString, isValidEmail } = require('../utils/validators')

function getGmailAuth() {
  const user = process.env.GMAIL_USER || process.env.SMTP_USER || null
  const pass =
    process.env.GMAIL_PASS ||
    process.env.GMAIL_APP_PASSWORD ||
    process.env.SMTP_PASS ||
    null

  if (!user || !pass) return null
  return { user, pass }
}

async function sendOtpEmail({ to, otp, expiresInSeconds }) {
  const gmail = getGmailAuth()
  if (!gmail) return { sent: false, reason: 'Gmail credentials not configured' }

  let nodemailer
  try {
    nodemailer = require('nodemailer')
  } catch (_err) {
    void _err
    return { sent: false, reason: 'Email service not installed' }
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmail.user, pass: gmail.pass },
  })

  try {
    const info = await transporter.sendMail({
      from: gmail.user,
      to,
      subject: 'Wellsphere verification code',
      text: `Your Wellsphere verification code is ${otp}. It expires in ${expiresInSeconds} seconds.`,
    })
    return { sent: true, messageId: info?.messageId || null }
  } catch (_err) {
    const msg = _err && typeof _err === 'object' && 'message' in _err ? String(_err.message) : 'Failed to send email'
    const code = _err && typeof _err === 'object' && 'code' in _err ? String(_err.code) : null
    return { sent: false, reason: msg, code }
  }
}

function generateOtp() {
  const n = crypto.randomInt(0, 1000000)
  return String(n).padStart(6, '0')
}

async function issueOtp({ email, purpose }) {
  if (!isValidEmail(email)) throw httpError(400, 'Valid email is required')
  if (purpose !== 'auth' && purpose !== 'forgot_password') throw httpError(400, 'Invalid purpose')

  const normalizedEmail = email.trim().toLowerCase()
  const { expiresInSeconds } = getOtpConfig()

  const otp = generateOtp()
  const otpHash = await bcrypt.hash(otp, 10)

  await Otp.updateMany(
    { email: normalizedEmail, purpose, consumedAt: null },
    { $set: { consumedAt: new Date() } }
  )

  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000)
  await Otp.create({ email: normalizedEmail, purpose, otpHash, expiresAt })

  const mail = await sendOtpEmail({ to: normalizedEmail, otp, expiresInSeconds })

  return { email: normalizedEmail, purpose, otp, expiresIn: expiresInSeconds, mail }
}

async function verifyOtp({ email, otp, purpose }) {
  if (!isValidEmail(email)) throw httpError(400, 'Valid email is required')
  if (!isNonEmptyString(otp) || otp.trim().length !== 6) throw httpError(400, 'OTP must be 6 digits')
  if (purpose !== 'auth' && purpose !== 'forgot_password') throw httpError(400, 'Invalid purpose')

  const normalizedEmail = email.trim().toLowerCase()

  const record = await Otp.findOne({ email: normalizedEmail, purpose, consumedAt: null })
    .select('+otpHash')
    .sort({ createdAt: -1 })

  if (!record || !record.isActive()) throw httpError(401, 'Invalid or expired OTP')

  const ok = await bcrypt.compare(otp.trim(), record.otpHash)
  if (!ok) throw httpError(401, 'Invalid or expired OTP')

  record.consumedAt = new Date()
  await record.save()

  return { email: normalizedEmail, purpose, verified: true }
}

async function sendOtp(payload) {
  const explicitPurpose = payload?.purpose ?? payload?.type ?? payload?.flow
  const isForgotPassword = payload?.forgotPassword ?? payload?.isForgotPassword ?? payload?.forgot_password ?? payload?.flag

  const purpose =
    explicitPurpose === 'forgot_password' ? 'forgot_password' :
    isForgotPassword === true ? 'forgot_password' :
    isForgotPassword === 'true' ? 'forgot_password' :
    isForgotPassword === 1 ? 'forgot_password' :
    isForgotPassword === '1' ? 'forgot_password' :
    isForgotPassword === 'forgot_password' ? 'forgot_password' :
    'auth'

  return issueOtp({ email: payload?.email, purpose })
}

module.exports = { issueOtp, verifyOtp, sendOtp }
