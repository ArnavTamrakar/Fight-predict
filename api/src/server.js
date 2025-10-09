import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mysql from 'mysql2/promise'; // use promise version for async/await
import 'dotenv/config';  // automatically loads .env
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Helper functions
function parseRecord(recordStr) {
  const cleanRecord = recordStr.replace(/\s*\(.*\)/, '');
  const [wins, losses, draws] = cleanRecord.split('-').map(Number);
  const ncMatch = recordStr.match(/\((\d+) NC\)/);
  const nc = ncMatch ? Number(ncMatch[1]) : 0;
  return { wins, losses, draws, nc };
}

function calculateAge(dobStr) {
  const birthDate = new Date(dobStr);
  const diffMs = Date.now() - birthDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
}

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Predict endpoint
app.post('/predict', async (req, res) => {
  const { fighter1, fighter2 } = req.body;

  try {
    const connection = await pool.getConnection();

    // Query fighter data from DB
    const [f1Rows] = await connection.query('SELECT * FROM fighters WHERE LOWER(name) = ?', [fighter1.toLowerCase()]);
    const [f2Rows] = await connection.query('SELECT * FROM fighters WHERE LOWER(name) = ?', [fighter2.toLowerCase()]);

    connection.release();

    if (!f1Rows[0] || !f2Rows[0]) {
      return res.status(404).json({ success: false, error: 'Fighter data not found' });
    }

    const fighter1Data = f1Rows[0];
    const fighter2Data = f2Rows[0];

    // Parse records
    const { wins: f1Wins, losses: f1Losses, draws: f1Draws, nc: f1NC } = parseRecord(fighter1Data.record);
    const { wins: f2Wins, losses: f2Losses, draws: f2Draws, nc: f2NC } = parseRecord(fighter2Data.record);

    // Compute features
    const f1StrAcc = parseFloat(fighter1Data.strAcc) / 100;
    const f2StrAcc = parseFloat(fighter2Data.strAcc) / 100;
    const f1TdSuccess = parseFloat(fighter1Data.tdAvg) * (parseFloat(fighter1Data.tdAcc) / 100);
    const f2TdSuccess = parseFloat(fighter2Data.tdAvg) * (parseFloat(fighter2Data.tdAcc) / 100);
    const f1Age = calculateAge(fighter1Data.DoB);
    const f2Age = calculateAge(fighter2Data.DoB);

    // Engineered features
    const sigStrikeDiff = f1StrAcc - f2StrAcc;
    const tdSuccessDiff = f1TdSuccess - f2TdSuccess;
    const ageDiff = f1Age - f2Age;
    const weightDiff = parseFloat(fighter1Data.weight) - parseFloat(fighter2Data.weight);
    const reachDiff = parseFloat(fighter1Data.reach) - parseFloat(fighter2Data.reach);
    const stanceMatchup = fighter1Data.stance === fighter2Data.stance ? 0 : 1;
    const tdDefDiff = (parseFloat(fighter1Data.tdDef) / 100) - (parseFloat(fighter2Data.tdDef) / 100);

    const features = [
      f1StrAcc,
      parseFloat(fighter1Data.SLpM),
      f2StrAcc,
      parseFloat(fighter2Data.SLpM),
      parseFloat(fighter1Data.tdAvg),
      f1TdSuccess,
      parseFloat(fighter2Data.tdAvg),
      f2TdSuccess,
      parseFloat(fighter1Data.tdAvg),
      parseFloat(fighter1Data.tdDef) / 100,
      parseFloat(fighter2Data.tdAvg),
      parseFloat(fighter2Data.tdDef) / 100,
      parseFloat(fighter1Data.weight),
      parseFloat(fighter2Data.weight),
      f1Age,
      f2Age,
      f1Wins,
      f1Losses,
      f1Draws,
      f1NC,
      f2Wins,
      f2Losses,
      f2Draws,
      f2NC,
      sigStrikeDiff,
      f1TdSuccess,
      f2TdSuccess,
      tdSuccessDiff,
      ageDiff,
      weightDiff,
      reachDiff,
      stanceMatchup,
      tdDefDiff
    ];

    console.log('Computed features:', features);

    // Return features for now; you can integrate your ML model call here
    // res.json({ success: true, features });

    const mlResponse = await axios.post('http://localhost:8000/predict-array', { features });
      console.log(mlResponse.data);

    res.json({ prediction: mlResponse.data });
  } catch (error) {
    console.error('Error querying DB:', error);
    res.status(500).json({ success: false, error: 'Database query failed' });
  }

    
});

// Fetch all fighter names
app.get('/api/fighters', async (_req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT name FROM fighters');
    connection.release();
    const fighterNames = rows.map(r => r.name);
    res.json(fighterNames);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch fighters' });
  }
});

app.listen(PORT, () => {
  console.log('Server is running on port', PORT);
});
