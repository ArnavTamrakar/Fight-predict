import { useState } from 'react';
import FighterInput from './components/fighterinput';
import './App.css';
import Header from './components/header';

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
    <div>
      <Header />
      <div className="Prediction-Form">
        <div className="Prediction-Form-header">
          <h2>Enter the names of the fighters you want to compare</h2>
        </div>
        <div className="Prediction-Form">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <FighterInput label="Fighter 1" onSelect={setFighter1} />
              <span className="vs-text">VS</span>
              <FighterInput label="Fighter 2" onSelect={setFighter2} />
            </div>
            <button type="submit">Predict</button>
          </form>

        </div>
        {result && (
          <div className='results'>
            <h3>Fight Prediction</h3>
            <p>{fighter1} win Probability: {(result.prediction.probabilities[0] * 100).toFixed(1)}%</p>
            <p>{fighter2} win Probability: {(result.prediction.probabilities[1] * 100).toFixed(1)}%</p>
            {/* <p>
              Winner: <strong>
                {result.prediction.winner === "Fighter 1" ? fighter1 : fighter2}
              </strong>
            </p> */}
          </div>
        )}
      </div>
    </div>
  );
}
export default App;
