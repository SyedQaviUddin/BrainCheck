from fastapi import FastAPI, Request
from pydantic import BaseModel
import joblib
import os
from fastapi.middleware.cors import CORSMiddleware
import json

model_path = os.path.join(os.path.dirname(__file__), 'model.pkl')
model = joblib.load(model_path)

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TypingInput(BaseModel):
    avg_dwell_time: float
    avg_flight_time: float
    backspace_count: int
    total_time: float

# Try to get feature importances from the model
try:
    feature_importances = model.feature_importances_
except AttributeError:
    feature_importances = None

@app.post("/predict")
async def predict(request: Request, data: TypingInput):
    X = [[
        data.avg_dwell_time,
        data.avg_flight_time,
        data.backspace_count,
        data.total_time
    ]]
    pred = model.predict(X)[0]
    prob = model.predict_proba(X).max()
    # Research mode: save anonymized data if header is set
    if request.headers.get('x-research-mode') == '1':
        research_data = {
            "input": X[0],
            "prediction": pred,
            "confidence": round(prob * 100, 2)
        }
        with open(os.path.join(os.path.dirname(__file__), 'research_data.jsonl'), 'a') as f:
            f.write(json.dumps(research_data) + '\n')
    # Feature importances for explainability
    fi = None
    if feature_importances is not None:
        fi = {
            "avg_dwell_time": feature_importances[0],
            "avg_flight_time": feature_importances[1],
            "backspace_count": feature_importances[2],
            "total_time": feature_importances[3]
        }
    return {
        "prediction": pred,
        "confidence": round(prob * 100, 2),
        "feature_importances": fi
    }

@app.get("/")
def root():
    return {"message": "Backend is set up!"} 