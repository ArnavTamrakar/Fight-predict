import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';


const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (_req, res) => res.json({status: 'ok'}));

app.post('/predict', (req, res) => {
  const fighter1Data = [];
  const fighter2Data = [];
  const { fighter1, fighter2 } = req.body;

  console.log('Received data:', fighter1, fighter2);

  fs.createReadStream('fighters.csv')
  .pipe(csv())
  .on('data', (row) => {
    if (row.name === fighter1) {
      fighter1Data.push(row);
      console.log('Fighter 1 data found:', row);
    }

    if (row.name === fighter2) {
      fighter2Data.push(row);
      console.log('Fighter 2 data found:', row);
    }
  })
  .on('end', () => {
    console.log('Finished reading CSV');
    console.log('Fighter1 Data:', fighter1Data);
    console.log('Fighter2 Data:', fighter2Data);
  });

  function parseRecord(recordStr) {
  // Remove anything in parentheses for wins-losses-draws
  const cleanRecord = recordStr.replace(/\s*\(.*\)/, '');
  const [wins, losses, draws] = cleanRecord.split('-').map(Number);

  // Extract NC separately if it exists
  const ncMatch = recordStr.match(/\((\d+) NC\)/);
  const nc = ncMatch ? Number(ncMatch[1]) : 0;

  return { wins, losses, draws, nc };
}

  // First, parse the records
const { wins: f1Wins, losses: f1Losses, draws: f1Draws, nc: f1NC } = parseRecord(fighter1Data.record);
const { wins: f2Wins, losses: f2Losses, draws: f2Draws, nc: f2NC } = parseRecord(fighter2Data.record);

// Convert percentages to numbers
const f1StrAcc = parseFloat(fighter1Data.strAcc) / 100; // e.g., "50%" -> 0.5
const f2StrAcc = parseFloat(fighter2Data.strAcc) / 100;

// Compute takedown success rates
const f1TdSuccess = parseFloat(fighter1Data.tdAvg) * (parseFloat(fighter1Data.tdAcc) / 100);
const f2TdSuccess = parseFloat(fighter2Data.tdAvg) * (parseFloat(fighter2Data.tdAcc) / 100);

// Calculate ages from DoB
function calculateAge(dobStr) {
  const birthDate = new Date(dobStr);
  const diffMs = Date.now() - birthDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
}

const f1Age = calculateAge(fighter1Data.DoB);
const f2Age = calculateAge(fighter2Data.DoB);

// Engineered features
const sigStrikeDiff = f1StrAcc - f2StrAcc;
const tdSuccessDiff = f1TdSuccess - f2TdSuccess;
const ageDiff = f1Age - f2Age;
const weightDiff = parseFloat(fighter1Data.weight) - parseFloat(fighter2Data.weight);
const reachDiff = parseFloat(fighter1Data.reach) - parseFloat(fighter2Data.reach);
const stanceMatchup = fighter1Data.stance === fighter2Data.stance ? 0 : 1;
const tdDefDiff = (parseFloat(fighter1Data.tdDef)/100) - (parseFloat(fighter2Data.tdDef)/100);

// Now construct the feature array
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
  parseFloat(fighter1Data.tdDef)/100,
  parseFloat(fighter2Data.tdAvg),
  parseFloat(fighter2Data.tdDef)/100,
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
  // Engineered features
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
});

app.listen(PORT, () => {
  console.log('Server is running on port', PORT);
});