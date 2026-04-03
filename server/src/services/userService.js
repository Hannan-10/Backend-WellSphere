const { User } = require('../models/User')
const { Profile } = require('../models/Profile')
const { RefreshToken } = require('../models/RefreshToken')
const { Otp } = require('../models/Otp')
const { httpError } = require('../utils/httpError')

async function deleteAccountById(userId) {
  if (!userId) throw httpError(400, 'User id is required')

  const user = await User.findById(userId).select('_id email')
  if (!user) throw httpError(404, 'User not found')

  await Promise.all([
    Profile.deleteOne({ userId }),
    RefreshToken.deleteMany({ userId }),
    Otp.deleteMany({ email: user.email }),
  ])

  await User.deleteOne({ _id: userId })

  return { message: 'Account deleted' }
}

module.exports = { deleteAccountById }
