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

  // res.json({
  //   success: true,
  //   message: `Received fighters: ${fighter1} vs ${fighter2}`,
  //   data: { fighter1, fighter2 }
  // });


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
});

app.listen(PORT, () => {
  console.log('Server is running on port', PORT);
});