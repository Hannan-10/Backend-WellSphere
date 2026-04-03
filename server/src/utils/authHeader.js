function extractBearerToken(authorizationHeader) {
  if (typeof authorizationHeader !== 'string') return null
  const raw = authorizationHeader.trim()
  if (!raw) return null
  const [scheme, token] = raw.split(/\s+/)
  if (!scheme || scheme.toLowerCase() !== 'bearer') return null
  if (!token) return null
  return token
}

module.exports = { extractBearerToken }
