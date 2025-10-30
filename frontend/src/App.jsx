import { useState } from 'react';
import FighterInput from './components/fighterinput';
import './App.css';
import Header from './components/header';

function App() {
  const [fighter1, setFighter1] = useState('');
  const [fighter2, setFighter2] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  
  const API_BASE = import.meta.env.PROD ? import.meta.env.VITE_API_URL || '' : '';

  const handleSubmit = async e => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fighter1, fighter2 }),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || `Request failed with ${res.status}`);

      const data = JSON.parse(text);
      setResult(data);
    } catch (err) {
      console.error('Predict failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      <Header />
      <div className="main-container">
        <div className="hero-section">
          <h1 className="hero-title">FightPredict</h1>
          <p className="hero-subtitle">Predict the outcome of UFC fights using advanced machine learning</p>
        </div>
        
        <div className="prediction-card">
          <div className="card-header">
            <h2>Select Fighters</h2>
            <p>Choose two fighters to see the prediction</p>
          </div>
          
          <form onSubmit={handleSubmit} className="prediction-form">
            <div className="fighters-container">
              <div className="fighter-input-wrapper">
                <FighterInput label="Fighter 1" onSelect={setFighter1} />
              </div>
              
              <div className="vs-container">
                <span className="vs-text">VS</span>
              </div>
              
              <div className="fighter-input-wrapper">
                <FighterInput label="Fighter 2" onSelect={setFighter2} />
              </div>
            </div>
            
            <button 
              type="submit" 
              className={`predict-button ${isLoading ? 'loading' : ''}`}
              disabled={!fighter1 || !fighter2 || isLoading}
            >
              {isLoading ? (
                <>
                  <div className="spinner"></div>
                  Predicting...
                </>
              ) : (
                'Predict Winner'
              )}
            </button>
          </form>

          {result && (
            <div className="result-container">
              <div className="result-card">
                <h3>Prediction Result</h3>
                <div className="result-content">
                  <div className="winner-info">
                    <div className="winner-name">
                      {result.winner || 'Winner'}
                    </div>
                    <div className="confidence-score">
                      Confidence: {result.confidence ? `${(result.confidence * 100).toFixed(1)}%` : 'N/A'}
                    </div>
                  </div>
                  <div className="detailed-results">
                    <pre>{JSON.stringify(result, null, 2)}</pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default App;
