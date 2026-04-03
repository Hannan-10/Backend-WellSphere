function isNonEmptyString(val) {
  return typeof val === 'string' && val.trim().length > 0
}

function isValidEmail(email) {
  if (!isNonEmptyString(email)) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

function parseRole(val) {
  const num = typeof val === 'string' ? Number(val) : val
  if (num === 0 || num === 1) return num
  return null
}

module.exports = { isNonEmptyString, isValidEmail, parseRole }
