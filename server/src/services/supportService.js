const { SupportMessage } = require('../models/SupportMessage')
const { httpError } = require('../utils/httpError')
const { isNonEmptyString, isValidEmail } = require('../utils/validators')
const mongoose = require('mongoose')

function cleanString(val, maxLen) {
  if (typeof val !== 'string') return ''
  const s = val.trim()
  if (!s) return ''
  return typeof maxLen === 'number' ? s.slice(0, maxLen) : s
}

function getAdminEmail() {
  return process.env.SUPPORT_ADMIN_EMAIL || 'admin@wellsphere.com'
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST
  const portRaw = process.env.SMTP_PORT
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const secureRaw = process.env.SMTP_SECURE

  const port = portRaw ? Number(portRaw) : null
  const secure =
    secureRaw === 'true' ? true :
    secureRaw === '1' ? true :
    false

  if (!host || !port || !user || !pass) return null

  return { host, port, secure, user, pass }
}

async function sendMailToAdmin({ name, email, subject, message }) {
  const smtp = getSmtpConfig()
  const adminEmail = getAdminEmail()

  if (!smtp) {
    return { sent: false, adminEmail, reason: 'SMTP not configured' }
  }

  let nodemailer
  try {
    nodemailer = require('nodemailer')
  } catch (_err) {
    void _err
    return { sent: false, adminEmail, reason: 'Email service not installed' }
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
  })

  const info = await transporter.sendMail({
    from: smtp.user,
    to: adminEmail,
    replyTo: email,
    subject: subject,
    text: [`Name: ${name}`, `Email: ${email}`, '', message].join('\n'),
  })

  return { sent: true, adminEmail, messageId: info?.messageId || null }
}

async function contactSupport({ userId, payload }) {
  const name = cleanString(payload?.name, 120)
  const email = cleanString(payload?.email, 200).toLowerCase()
  const subject = cleanString(payload?.subject, 160)
  const message = cleanString(payload?.message, 4000)

  if (!isNonEmptyString(name)) throw httpError(400, 'Name is required')
  if (!isValidEmail(email)) throw httpError(400, 'Valid email is required')
  if (!isNonEmptyString(subject)) throw httpError(400, 'Subject is required')
  if (!isNonEmptyString(message)) throw httpError(400, 'Message is required')

  const adminEmail = getAdminEmail()
  const doc = await SupportMessage.create({
    userId: userId || null,
    name,
    email,
    subject,
    message,
    adminEmail,
    status: 'open',
    resolvedAt: null,
  })

  const mail = await sendMailToAdmin({ name, email, subject, message })

  return { ticket: doc, mail }
}

function buildMailtoLink({ name, email, subject, message }) {
  const to = getAdminEmail()
  const lines = [
    isNonEmptyString(name) ? `Name: ${name.trim()}` : null,
    isNonEmptyString(email) ? `Email: ${email.trim()}` : null,
    '',
    isNonEmptyString(message) ? message.trim() : '',
  ].filter(v => v !== null)

  const body = lines.join('\n')
  const params = new URLSearchParams()
  if (isNonEmptyString(subject)) params.set('subject', subject.trim())
  if (isNonEmptyString(body)) params.set('body', body)

  const qs = params.toString()
  return { to, mailto: `mailto:${to}${qs ? `?${qs}` : ''}` }
}

async function sendSupportEmail({ payload }) {
  const name = cleanString(payload?.name, 120)
  const email = cleanString(payload?.email, 200).toLowerCase()
  const subject = cleanString(payload?.subject, 160)
  const message = cleanString(payload?.message, 4000)

  if (!isNonEmptyString(name)) throw httpError(400, 'Name is required')
  if (!isValidEmail(email)) throw httpError(400, 'Valid email is required')
  if (!isNonEmptyString(subject)) throw httpError(400, 'Subject is required')
  if (!isNonEmptyString(message)) throw httpError(400, 'Message is required')

  const mail = await sendMailToAdmin({ name, email, subject, message })
  return {
    ...mail,
    userEmail: email,
    subject,
    message,
  }
}

async function listTickets({ userId, role, status }) {
  const q = {}

  const normalizedStatus =
    status === 'open' ? 'open' :
    status === 'resolved' ? 'resolved' :
    null

  if (normalizedStatus) q.status = normalizedStatus

  if (role !== 1) {
    if (!userId) throw httpError(401, 'Invalid user')
    if (!mongoose.Types.ObjectId.isValid(userId)) throw httpError(401, 'Invalid user')
    q.userId = userId
  }

  const tickets = await SupportMessage.find(q).sort({ createdAt: -1 })
  const items = tickets.map(t => t.toPublic())

  const openCount = await SupportMessage.countDocuments({ ...(q.userId ? { userId: q.userId } : {}), status: 'open' })
  const resolvedCount = await SupportMessage.countDocuments({ ...(q.userId ? { userId: q.userId } : {}), status: 'resolved' })

  return { tickets: items, counts: { open: openCount, resolved: resolvedCount } }
}

async function resolveTicket({ userId, role, ticketId }) {
  if (role !== 1) throw httpError(403, 'Only admin can resolve tickets')
  if (!mongoose.Types.ObjectId.isValid(ticketId)) throw httpError(400, 'Invalid ticket id')
  void userId

  const doc = await SupportMessage.findByIdAndUpdate(
    ticketId,
    { $set: { status: 'resolved', resolvedAt: new Date() } },
    { new: true }
  )

  if (!doc) throw httpError(404, 'Ticket not found')
  return { ticket: doc }
}

module.exports = { contactSupport, buildMailtoLink, sendSupportEmail, listTickets, resolveTicket }
