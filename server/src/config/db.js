const mongoose = require('mongoose')

async function connectToDatabase(mongoUri) {
  if (!mongoUri) {
    const err = new Error('MONGO_URI is required')
    err.statusCode = 500
    throw err
  }

  await mongoose.connect(mongoUri)
}

module.exports = { connectToDatabase }
