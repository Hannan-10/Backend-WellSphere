function durationToSeconds(val) {
  if (typeof val === 'number' && Number.isFinite(val)) return Math.max(0, Math.floor(val))
  if (typeof val !== 'string') return null

  const raw = val.trim()
  if (!raw) return null

  if (/^\d+$/.test(raw)) return Number(raw)

  const match = raw.match(/^(\d+)\s*([smhd])$/i)
  if (!match) return null

  const n = Number(match[1])
  const unit = match[2].toLowerCase()

  if (unit === 's') return n
  if (unit === 'm') return n * 60
  if (unit === 'h') return n * 60 * 60
  if (unit === 'd') return n * 60 * 60 * 24
  return null
}

module.exports = { durationToSeconds }
