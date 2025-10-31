import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import csv from 'csv-parser';
import fs from 'fs';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 8080;

// Use hosted model URL in prod, fallback to local in dev
const MODEL_URL = process.env.MODEL_URL || 'http://localhost:8000';

// ES module safe __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try multiple possible CSV locations
const possiblePaths = [
  path.join(__dirname, '..', '..', 'ml_service', 'data', 'fighters.csv'),
  path.join(process.cwd(), 'ml_service', 'data', 'fighters.csv'),
  '/ml_service/data/fighters.csv',
  path.join(__dirname, 'data', 'fighters.csv')
];

let CSV_PATH = null;
for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    CSV_PATH = p;
    console.log(`✅ Found CSV at: ${p}`);
    break;
  } else {
    console.log(`❌ CSV not found at: ${p}`);
  }
}

if (!CSV_PATH) {
  console.error('🚨 CRITICAL: fighters.csv not found in any expected location!');
}

// Update CORS to allow your Vercel domain explicitly
app.use(cors({
  origin: [
    'https://fight-predict.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true
}));

app.use(morgan('dev'));
app.use(express.json());

// Helpers
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
app.get('/health', (_req, res) => res.json({ status: 'ok', modelUrl: MODEL_URL, csvPath: CSV_PATH }));

// Predict
app.post('/predict', (req, res) => {
  const fighter1Data = [];
  const fighter2Data = [];
  const { fighter1, fighter2 } = req.body;

  console.log('Received data:', fighter1, fighter2);
  console.log('Reading CSV at:', CSV_PATH);

  // Read CSV asynchronously
  fs.createReadStream(CSV_PATH)
    .pipe(csv())
    .on('data', (row) => {
      if (row.name && row.name.trim().toLowerCase() === fighter1.toLowerCase()) {
        fighter1Data.push(row);
        console.log(`Found Fighter 1: ${row.name}`);
      }
      if (row.name && row.name.trim().toLowerCase() === fighter2.toLowerCase()) {
        fighter2Data.push(row);
        console.log(`Found Fighter 2: ${row.name}`);
      }
    })
    .on('end', async () => {
      console.log('Finished reading CSV');
      console.log('Fighter1 Data:', fighter1Data[0]);
      console.log('Fighter2 Data:', fighter2Data[0]);

      if (!fighter1Data[0] || !fighter2Data[0]) {
        return res.status(404).json({ success: false, error: 'Fighter data not found' });
      }

      // Parse records
      const { wins: f1Wins, losses: f1Losses, draws: f1Draws, nc: f1NC } = parseRecord(fighter1Data[0].record);
      const { wins: f2Wins, losses: f2Losses, draws: f2Draws, nc: f2NC } = parseRecord(fighter2Data[0].record);

      // Compute features
      const f1StrAcc = parseFloat(fighter1Data[0].strAcc) / 100;
      const f2StrAcc = parseFloat(fighter2Data[0].strAcc) / 100;
      const f1TdSuccess = parseFloat(fighter1Data[0].tdAvg) * (parseFloat(fighter1Data[0].tdAcc) / 100);
      const f2TdSuccess = parseFloat(fighter2Data[0].tdAvg) * (parseFloat(fighter2Data[0].tdAcc) / 100);
      const f1Age = calculateAge(fighter1Data[0].DoB);
      const f2Age = calculateAge(fighter2Data[0].DoB);

      // Engineered features
      const sigStrikeDiff = f1StrAcc - f2StrAcc;
      const tdSuccessDiff = f1TdSuccess - f2TdSuccess;
      const ageDiff = f1Age - f2Age;
      const weightDiff = parseFloat(fighter1Data[0].weight) - parseFloat(fighter2Data[0].weight);
      const reachDiff = parseFloat(fighter1Data[0].reach) - parseFloat(fighter2Data[0].reach);
      const stanceMatchup = fighter1Data[0].stance === fighter2Data[0].stance ? 0 : 1;
      const tdDefDiff = (parseFloat(fighter1Data[0].tdDef) / 100) - (parseFloat(fighter2Data[0].tdDef) / 100);

      const features = [
        f1StrAcc,
        parseFloat(fighter1Data[0].SLpM),
        f2StrAcc,
        parseFloat(fighter2Data[0].SLpM),
        parseFloat(fighter1Data[0].tdAvg),
        f1TdSuccess,
        parseFloat(fighter2Data[0].tdAvg),
        f2TdSuccess,
        parseFloat(fighter1Data[0].tdAvg),
        parseFloat(fighter1Data[0].tdDef) / 100,
        parseFloat(fighter2Data[0].tdAvg),
        parseFloat(fighter2Data[0].tdDef) / 100,
        parseFloat(fighter1Data[0].weight),
        parseFloat(fighter2Data[0].weight),
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

      console.log('Using MODEL_URL:', MODEL_URL);
      console.log('Computed features length:', features.length);

      try {
        const mlResponse = await axios.post(`${MODEL_URL}/predict-array`, { features });
        res.json({ prediction: mlResponse.data });
      } catch (error) {
        console.error('Error calling ML model:', error?.response?.data || error?.message || error);
        res.status(500).json({ success: false, error: 'ML prediction failed' });
      }
    })
    .on('error', (error) => {
      console.error('Error reading CSV:', error);
      res.status(500).json({ success: false, error: 'Failed to read fighter data' });
    });
});

// Fighters list for autocomplete
app.get('/api/fighters', (_req, res) => {
  const fighters = [];

  console.log('Reading CSV at:', CSV_PATH);

  fs.createReadStream(CSV_PATH)
    .pipe(csv())
    .on('data', (row) => {
      if (row.name) {
        fighters.push(row.name);
      }
    })
    .on('end', () => {
      console.log(`Loaded ${fighters.length} fighters`);
      res.json(fighters);
    })
    .on('error', (error) => {
      console.error('Error in /api/fighters:', error);
      res.status(500).json({ error: 'Failed to fetch fighters' });
    });
});

app.listen(PORT, () => {
  console.log('Server is running on port', PORT);
  console.log('MODEL_URL:', MODEL_URL);
  console.log('CSV_PATH:', CSV_PATH);
});
