# ML Webapp

Monorepo with a React frontend, Express API, and Python FastAPI ML service (XGBoost).

## Structure
- frontend/ — Vite + React app
- api/ — Express server proxying to ML service
- ml_service/ — FastAPI service with training and inference
- infra/ — docker-compose and deployment scaffolding

## Quickstart (Docker)
1. From `infra/`, run:
   ```bash
   docker compose up --build
   ```
2. Open frontend at http://localhost:5173
3. The API is at http://localhost:5000 and ML service at http://localhost:8000

## Local Dev
- Frontend:
  ```bash
  cd frontend && npm install && npm run dev
  ```
- API:
  ```bash
  cd api && npm install && npm run dev
  ```
- ML Service:
  ```bash
  cd ml_service
  pip install -r requirements.txt
  uvicorn src.app:app --reload --port 8000
  ```

## Train Model
Place your dataset at `ml_service/data/dataset.csv` with features in columns and target as the last column.
```bash
cd ml_service
python -m src.train
```
Artifacts saved to `ml_service/models/`.

## Predict API
- POST `http://localhost:8000/predict` body:
  ```json
  { "features": [1.0, 2.0, 3.0] }
  ```
- Through Express: POST `http://localhost:5000/api/predict` with same body.

## Notes
- Ensure the same scaler used during training is saved and loaded for inference.
- Update XGBoost/scikit-learn versions if needed for your environment.
