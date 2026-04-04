require('dotenv').config()
const { createApp } = require('./src/app')
const { connectToDatabase } = require('./src/config/db')

async function start() {
  const app = createApp()
  const port = process.env.PORT || 5000

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`)
  })

  await connectToDatabase(process.env.MONGO_URI)
}

start().catch(err => {
  console.error(err)
  process.exit(1)
})
