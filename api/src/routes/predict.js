import { Router } from 'express'
import fetch from 'node-fetch'

const router = Router()
const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000'

router.post('/api/predict', async (req, res) => {
  try {
    const response = await fetch(`${ML_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    })
    const data = await response.json()
    res.status(response.status).json(data)
  } catch (err) {
    console.error(err)
    res.status(502).json({ error: 'Upstream ML service unavailable' })
  }
})

export default router
