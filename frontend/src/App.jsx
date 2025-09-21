import { useState } from 'react'

function App() {
  const [features, setFeatures] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const payload = { features: features.split(',').map(v => Number(v.trim())) }
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Request failed')
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <h1>ML Webapp</h1>
      <form onSubmit={submit}>
        <label>
          Features (comma-separated):
          <input style={{ width: '100%', marginTop: 8 }} value={features} onChange={(e) => setFeatures(e.target.value)} placeholder="1.0, 2.0, 3.0" />
        </label>
        <button type="submit" disabled={loading} style={{ marginTop: 12 }}>
          {loading ? 'Predicting...' : 'Predict'}
        </button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {result && (
        <pre style={{ background: '#f5f5f5', padding: 12, marginTop: 12 }}>
{JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  )
}

export default App
