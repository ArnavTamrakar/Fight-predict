import { useState } from 'react';
import FighterInput from './components/fighterinput';
import './App.css';

function App() {
  const [fighter1, setFighter1] = useState('');
  const [fighter2, setFighter2] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = async e => {
    e.preventDefault();
    const res = await fetch('http://localhost:5000/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fighter1, fighter2 })
    });
    const data = await res.json();
    setResult(data);
  };

  return (
    <form onSubmit={handleSubmit}>
    <FighterInput label="Fighter 1" onSelect={setFighter1} />
    <FighterInput label="Fighter 2" onSelect={setFighter2} />
    <button type="submit">Predict</button>

    {result && (
      <div className='results'>
        <h3>Fight Prediction</h3>
        <p>{fighter1} win Probability: {(result.prediction.probabilities[0] * 100).toFixed(1)}%</p>
        <p>{fighter2} win Probability: {(result.prediction.probabilities[1] * 100).toFixed(1)}%</p>
        <p>
          Winner: <strong>
            {result.prediction.winner === "Fighter 1" ? fighter1 : fighter2}
          </strong>
        </p>
      </div>
    )}
  </form>
  );
}

export default App;
