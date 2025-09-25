import { useState } from 'react';
import './App.css';

function App() {
  const [fighter1, setFighter1] = useState('');
  const [fighter2, setFighter2] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('http://localhost:5000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fighter1, fighter2 })
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error posting data:', error);
      setResult({ success: false, error: error.message });
    }
  };

  return (
    <>
      <h1>UFC Fight Predict</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Fighter 1"
          value={fighter1}
          onChange={(e) => setFighter1(e.target.value)}
        />
        <input
          type="text"
          placeholder="Fighter 2"
          value={fighter2}
          onChange={(e) => setFighter2(e.target.value)}
        />
        <button type="submit">Predict</button>
      </form>

      {result && (
        <div className="result">
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </>
  );
}

export default App;
