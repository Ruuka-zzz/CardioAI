"""ml-service HTTP interface.

    uvicorn main:app --reload --port 8001

Contract is fixed by backend/services/clients.py:assess_baseline_risk —
POST /predict takes UCI-named fields and returns {risk_level, score}. Change
one side and you must change the other.
"""

import logging

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field

import predict as inference

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

app = FastAPI(title="CardioAI ML Service", version="0.1.0")


class PredictRequest(BaseModel):
    """Field names follow the UCI dataset, not the CardioAI schema.

    The backend does the translation in clients.py. Keeping the dataset's
    vocabulary here means train.py and this service speak the same language.
    """

    age: int = Field(ge=1, le=120)
    sex: int = Field(ge=0, le=1)            # 1 = male
    cp: int = Field(ge=0, le=3)             # chest pain type
    trestbps: int = Field(ge=60, le=260)    # resting blood pressure
    chol: int = Field(ge=50, le=700)        # cholesterol
    fbs: int = Field(ge=0, le=1)            # fasting blood sugar > 120
    restecg: int = Field(ge=0, le=2)
    thalach: int = Field(ge=50, le=250)     # max heart rate
    exang: int = Field(ge=0, le=1)          # exercise-induced angina
    oldpeak: float = Field(ge=0, le=10)     # ST depression
    slope: int = Field(ge=0, le=2)
    ca: int = Field(ge=0, le=3)             # major vessels
    thal: int = Field(ge=0, le=3)


class PredictResponse(BaseModel):
    risk_level: str
    score: float
    model_version: str = "uci_heart_rf"


@app.on_event("startup")
def load_model() -> None:
    """Fail loudly at startup, not at the first patient's intake."""
    try:
        inference.ModelStore.load()
    except FileNotFoundError as err:
        log.error("%s", err)
        log.error("Service will start but /predict will return 503.")


@app.get("/health")
def health():
    ready = inference.ModelStore.is_ready()
    return {"status": "ok" if ready else "degraded", "model_loaded": ready}


@app.post("/predict", response_model=PredictResponse)
def run_prediction(body: PredictRequest):
    if not inference.ModelStore.is_ready():
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Risk model is not loaded. Run train.py and restart the service.",
        )

    try:
        result = inference.predict(body.model_dump())
    except ValueError as err:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(err))

    return PredictResponse(risk_level=result.risk_level, score=result.score)