const supportService = require('../services/supportService')

async function contact(req, res) {
  const result = await supportService.contactSupport({ userId: req.auth?.userId || null, payload: req.body })
  res.status(201).json({ success: true, ticket: result.ticket.toPublic(), mail: result.mail })
}

async function mailto(req, res) {
  const result = supportService.buildMailtoLink({
    name: req.query?.name,
    email: req.query?.email,
    subject: req.query?.subject,
    message: req.query?.message,
  })
  res.status(200).json({ success: true, ...result })
}

async function sendMail(req, res) {
  const result = await supportService.sendSupportEmail({ payload: req.body })
  res.status(200).json({ success: true, ...result })
}

async function tickets(req, res) {
  const result = await supportService.listTickets({ userId: req.auth.userId, role: req.auth.role, status: req.query?.status })
  res.status(200).json({ success: true, tickets: result.tickets, counts: result.counts })
}

async function resolve(req, res) {
  const result = await supportService.resolveTicket({ userId: req.auth.userId, role: req.auth.role, ticketId: req.params.id })
  res.status(200).json({ success: true, ticket: result.ticket.toPublic() })
}

module.exports = { contact, mailto, sendMail, tickets, resolve }
