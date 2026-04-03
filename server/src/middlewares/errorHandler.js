function errorHandler(err, req, res, next) {
  if (err?.code === 11000) {
    return res.status(409).json({ message: 'Email is already in use' })
  }

  const statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 500
  const message = err?.message || 'Internal server error'
  res.status(statusCode).json({ message })
}

module.exports = { errorHandler }
