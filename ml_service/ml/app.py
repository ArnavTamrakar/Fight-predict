from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import joblib
import pandas as pd
import numpy as np
from typing import Dict, Any, List
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="UFC ML Prediction Service", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model variable
model = None

# Path to your model
ROOT = Path(__file__).resolve().parent  # points to ml_service
MODEL_PATH = ROOT / "models" / "best_fight_model.pkl"

def load_model():
    """Load the trained model"""
    global model
    try:
        logger.info(f"Loading model from {MODEL_PATH}")
        model = joblib.load(str(MODEL_PATH))
        logger.info(f"Model loaded successfully: {type(model).__name__}")
        
        if hasattr(model, 'feature_names_in_'):
            logger.info(f"Model expects {len(model.feature_names_in_)} features")
        
        return True
    except Exception as e:
        logger.error(f"Error loading model: {e}")
        return False

@app.on_event("startup")
async def startup_event():
    """Load model when the app starts"""
    if not load_model():
        logger.error("Failed to load model on startup")
        
@app.get("/")
async def root():
    return {
        "message": "UFC ML Prediction Service",
        "model_loaded": model is not None,
        "status": "ready"
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "model_loaded": model is not None
    }

@app.post("/predict-raw")
async def predict_raw(data: Dict[str, Any]):
    """
    Accept preprocessed JSON data and return prediction
    Input: {"feature1": value1, "feature2": value2, ...}
    """
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    try:
        # Convert preprocessed data directly to DataFrame
        df = pd.DataFrame([data])
        
        # Make prediction
        prediction = model.predict(df)[0]
        probabilities = model.predict_proba(df)[0].tolist() if hasattr(model, 'predict_proba') else [0.5, 0.5]
        
        return {
            "success": True,
            "prediction": int(prediction),
            "probabilities": probabilities,
            "winner": "Fighter 1" if prediction == 1 else "Fighter 2",
            "confidence": max(probabilities)
        }
        
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return {
            "success": False,
            "error": str(e)
        }

@app.post("/predict-array")
async def predict_array(data: Dict[str, List[float]]):
    """
    Accept features as an array
    Input: {"features": [value1, value2, value3, ...]}
    """
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    try:
        feature_values = data["features"]
        
        # Get expected feature names from the model
        if hasattr(model, 'feature_names_in_'):
            feature_names = model.feature_names_in_
        else:
            # Fallback: use generic names
            feature_names = [f"feature_{i}" for i in range(len(feature_values))]
        
        # Convert array to dict then DataFrame
        feature_dict = dict(zip(feature_names, feature_values))
        df = pd.DataFrame([feature_dict])
        
        # Make prediction
        prediction = model.predict(df)[0]
        probabilities = model.predict_proba(df)[0].tolist() if hasattr(model, 'predict_proba') else [0.5, 0.5]

        
        
        return {
            "success": True,
            "prediction": int(prediction),
            "probabilities": probabilities,
            "winner": "Fighter 1" if prediction == 1 else "Fighter 2",
            "confidence": max(probabilities)
        }
        
    except Exception as e:
        logger.error(f"Array prediction error: {e}")
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)