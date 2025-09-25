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

  // Read CSV asynchronously
  fs.createReadStream('fighters.csv')
    .pipe(csv())
    .on('data', (row) => {
      if (row.name === fighter1) fighter1Data.push(row);
      if (row.name === fighter2) fighter2Data.push(row);
    })
    .on('end', () => {
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

      console.log('Computed features:', features);

      res.json({ success: true, features });
    });
});


app.listen(PORT, () => {
  console.log('Server is running on port', PORT);
});