const https = require('https')
const querystring = require('querystring')
const { User } = require('../models/User')
const { httpError } = require('../utils/httpError')
const { isNonEmptyString, isValidEmail, parseRole } = require('../utils/validators')
const sessionService = require('./sessionService')
const { hashPassword } = require('./passwordService')

function httpsJson({ method, url, headers, body }) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method, headers }, res => {
      let raw = ''
      res.setEncoding('utf8')
      res.on('data', chunk => { raw += chunk })
      res.on('end', () => {
        const status = res.statusCode || 0
        const ok = status >= 200 && status < 300
        let parsed = null
        if (raw) {
          try {
            parsed = JSON.parse(raw)
          } catch (_err) {
            parsed = { raw }
          }
        }
        if (!ok) {
          const err = new Error(parsed?.error_description || parsed?.message || `HTTP ${status}`)
          err.statusCode = status
          err.payload = parsed
          reject(err)
          return
        }
        resolve(parsed)
      })
    })

    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

async function getGoogleProfile({ accessToken }) {
  if (!isNonEmptyString(accessToken)) throw httpError(400, 'Google access token is required')

  const data = await httpsJson({
    method: 'GET',
    url: 'https://www.googleapis.com/oauth2/v3/userinfo',
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  const email = data?.email
  if (!isValidEmail(email)) throw httpError(401, 'Unable to read email from Google profile')

  return {
    provider: 'google',
    providerSub: data?.sub || null,
    email: email.trim().toLowerCase(),
    firstName: data?.given_name || '',
    lastName: data?.family_name || '',
  }
}

function getLinkedInConfig() {
  const clientId = process.env.LINKEDIN_CLIENT_ID || process.env.VITE_LINKEDIN_CLIENT_ID || null
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET || process.env.VITE_LINKEDIN_CLIENT_SECRET || null
  if (!clientId || !clientSecret) return null
  return { clientId, clientSecret }
}

async function exchangeLinkedInCode({ code, redirectUri }) {
  const cfg = getLinkedInConfig()
  if (!cfg) throw httpError(500, 'LinkedIn auth is not configured')
  if (!isNonEmptyString(code)) throw httpError(400, 'LinkedIn code is required')
  if (!isNonEmptyString(redirectUri)) throw httpError(400, 'redirectUri is required')

  const body = querystring.stringify({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
  })

  const token = await httpsJson({
    method: 'POST',
    url: 'https://www.linkedin.com/oauth/v2/accessToken',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body),
    },
    body,
  })

  const accessToken = token?.access_token
  if (!isNonEmptyString(accessToken)) throw httpError(401, 'LinkedIn token exchange failed')
  return accessToken
}

async function getLinkedInProfile({ code, redirectUri }) {
  const accessToken = await exchangeLinkedInCode({ code, redirectUri })

  const data = await httpsJson({
    method: 'GET',
    url: 'https://api.linkedin.com/v2/userinfo',
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  const email = data?.email
  if (!isValidEmail(email)) throw httpError(401, 'Unable to read email from LinkedIn profile')

  return {
    provider: 'linkedin',
    providerSub: data?.sub || null,
    email: email.trim().toLowerCase(),
    firstName: data?.given_name || '',
    lastName: data?.family_name || '',
  }
}

async function ensureUserFromSocial({ role, profile }) {
  const existing = await User.findOne({ email: profile.email })
  if (existing) {
    const patch = {}
    if (profile.provider === 'google' && profile.providerSub) patch['authProviders.google.sub'] = profile.providerSub
    if (profile.provider === 'linkedin' && profile.providerSub) patch['authProviders.linkedin.sub'] = profile.providerSub
    if (Object.keys(patch).length) await User.updateOne({ _id: existing._id }, { $set: patch })
    return existing
  }

  const roleNum = parseRole(role)
  if (roleNum === null) throw httpError(400, 'Role is required to create a new account')

  const randomPassword = cryptoRandomPassword()
  const passwordHash = await hashPassword(randomPassword)

  const authProviders = {
    google: { sub: null },
    linkedin: { sub: null },
  }
  if (profile.provider === 'google') authProviders.google.sub = profile.providerSub
  if (profile.provider === 'linkedin') authProviders.linkedin.sub = profile.providerSub

  const user = await User.create({
    role: roleNum,
    firstName: profile.firstName || 'User',
    lastName: profile.lastName || '',
    email: profile.email,
    passwordHash,
    authProviders,
  })

  return user
}

function cryptoRandomPassword() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let out = ''
  for (let i = 0; i < 24; i += 1) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

async function socialSignIn(payload) {
  const provider = payload?.provider
  if (provider !== 'google' && provider !== 'linkedin') throw httpError(400, 'Invalid provider')

  const profile = provider === 'google'
    ? await getGoogleProfile({ accessToken: payload?.accessToken ?? payload?.token })
    : await getLinkedInProfile({ code: payload?.code, redirectUri: payload?.redirectUri })

  const user = await ensureUserFromSocial({ role: payload?.role, profile })
  const session = await sessionService.createSession(user)

  return {
    user,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    accessTokenExpiresIn: session.expiresIn,
    refreshTokenExpiresIn: session.refreshExpiresIn,
  }
}

module.exports = { socialSignIn }
