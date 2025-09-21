import express from 'express'
import morgan from 'morgan'
import cors from 'cors'
import predictRouter from './routes/predict.js'

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

app.get('/health', (_req, res) => res.json({ status: 'ok' }))
app.use('/', predictRouter)

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`)
})
