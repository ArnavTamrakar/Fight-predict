from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import numpy as np
import os
import mysql.connector
from mysql.connector import Error

# Initialize FastAPI app
app = FastAPI(title="UFC Fight Prediction API", version="1.0.0")

# -------------------------
# Model configuration
# -------------------------
model_path = os.path.join(
    os.path.dirname(__file__),
    "..", "..", "ml_service", "models", "best_fight_model.pkl"
)

model = None

@app.on_event("startup")
async def load_model():
    global model
    try:
        model = joblib.load(model_path)
        print(f"Model loaded successfully from {model_path}")
    except Exception as e:
        print(f"Error loading model: {e}")
        model = None

# -------------------------
# MySQL / Cloud SQL config
# -------------------------
DB_HOST = os.getenv("DB_HOST")           # Cloud SQL public IP
DB_USER = os.getenv("DB_USER")           # MySQL username
DB_PASSWORD = os.getenv("DB_PASSWORD")   # MySQL password
DB_NAME = os.getenv("DB_NAME")           # Database name
DB_PORT = int(os.getenv("DB_PORT", 3306))

def log_prediction_to_db(features: list[float], prediction: int, confidence: float):
    """Logs prediction to Cloud SQL"""
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            port=DB_PORT
        )
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO predictions (features, prediction, confidence) VALUES (%s, %s, %s)",
            (str(features), int(prediction), float(confidence))
        )
        conn.commit()
        cursor.close()
        conn.close()
    except Error as e:
        print(f"Error logging prediction to DB: {e}")

# -------------------------
# Request/response models
# -------------------------
class PredictionRequest(BaseModel):
    features: list[float]  # 33 pre-processed features

class PredictionResponse(BaseModel):
    prediction: int  # 0 = Fighter 2 wins, 1 = Fighter 1 wins
    winner: str  # "Fighter 1 wins" or "Fighter 2 wins"
    confidence: float
    probabilities: list[float]

# -------------------------
# API Endpoints
# -------------------------
@app.get("/")
async def root():
    return {"message": "UFC Fight Prediction API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy" if model is not None else "unhealthy",
        "model_loaded": model is not None
    }

@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """Send pre-processed features to model and get prediction"""
    
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    if len(request.features) != 33:
        raise HTTPException(status_code=400, detail="Expected exactly 33 features")
    
    try:
        # Convert to numpy array
        features = np.array([request.features])
        
        # Make prediction
        prediction = model.predict(features)[0]
        
        # Get prediction probabilities
        if hasattr(model, 'predict_proba'):
            probabilities = model.predict_proba(features)[0].tolist()
        else:
            probabilities = [0.5, 0.5]
        
        # Get confidence (probability of predicted class)
        confidence = probabilities[prediction]
        
        # Optional: log prediction to Cloud SQL
        log_prediction_to_db(request.features, prediction, confidence)
        
        return PredictionResponse(
            prediction=int(prediction),
            winner="Fighter 1 wins" if prediction == 1 else "Fighter 2 wins",
            confidence=float(confidence),
            probabilities=probabilities
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction failed: {str(e)}")

# -------------------------
# Run the server
# -------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
