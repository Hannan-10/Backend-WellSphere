require('dotenv').config()
const { createApp } = require('./src/app')
const { connectToDatabase } = require('./src/config/db')

async function start() {
  await connectToDatabase(process.env.MONGO_URI)

  const app = createApp()
  const port = process.env.PORT || 5000

  app.listen(port, () => {
    console.log(`Server running on port ${port}`)
  })
}

start().catch(err => {
  console.error(err)
  process.exit(1)
})
