from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import numpy as np
import os

# Initialize FastAPI app
app = FastAPI(title="UFC Fight Prediction API", version="1.0.0")

# Model configuration
model_path = os.path.join(os.path.dirname(__file__), "..", "..", "ml_service", "models", "best_fight_model.pkl")

# Load model on startup
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

# Simple request/response models
class PredictionRequest(BaseModel):
    features: list[float]  # 33 pre-processed features

class PredictionResponse(BaseModel):
    prediction: int  # 0 = Fighter 2 wins, 1 = Fighter 1 wins
    winner: str  # "Fighter 1 wins" or "Fighter 2 wins"
    confidence: float
    probabilities: list[float]

# API Endpoints
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
        
        return PredictionResponse(
            prediction=int(prediction),
            winner="Fighter 1 wins" if prediction == 1 else "Fighter 2 wins",
            confidence=float(confidence),
            probabilities=probabilities
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
