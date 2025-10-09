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

      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </form>
  );
}

export default App;
