"""ml-service HTTP interface.

    uvicorn main:app --reload --port 8001

Contract is fixed by backend/services/clients.py:assess_baseline_risk —
POST /predict takes the answerable baseline fields and returns
{risk_level, score}.

Field names here match the CardioAI questionnaire, not the source dataset.
The dataset's own names (ap_hi, alco, active) are translated once, in
preprocess.normalise_columns, so nothing else has to remember them.
"""

import logging

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field, model_validator

import predict as inference

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

app = FastAPI(title="CardioAI ML Service", version="0.2.0")


class PredictRequest(BaseModel):
    """Everything here is something a patient can answer without a lab.

    Cholesterol and glucose are deliberately absent: the source dataset has
    them, but most patients have never been tested, and a field where the
    common answer is "don't know" adds noise rather than signal.
    """

    age: int = Field(ge=18, le=100)
    gender: int = Field(ge=0, le=1, description="1 = male")

    height_cm: float = Field(ge=120, le=220)
    weight_kg: float = Field(ge=30, le=200)

    systolic_bp: int = Field(ge=70, le=250)
    diastolic_bp: int = Field(ge=40, le=150)

    smokes: int = Field(ge=0, le=1)
    drinks_alcohol: int = Field(ge=0, le=1)
    physically_active: int = Field(ge=0, le=1)

    @model_validator(mode="after")
    def systolic_above_diastolic(self):
        if self.systolic_bp <= self.diastolic_bp:
            raise ValueError(
                "Systolic blood pressure must be higher than diastolic."
            )
        return self


class PredictResponse(BaseModel):
    risk_level: str
    score: float
    model_version: str


@app.on_event("startup")
def load_model() -> None:
    """Fail loudly at startup, not at the first patient's baseline."""
    try:
        inference.ModelStore.load()
    except FileNotFoundError as err:
        log.error("%s", err)
        log.error("Service will start but /predict will return 503.")


@app.get("/health")
def health():
    ready = inference.ModelStore.is_ready()
    return {
        "status": "ok" if ready else "degraded",
        "model_loaded": ready,
        **inference.ModelStore.info(),
    }


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
    except RuntimeError as err:
        log.error("%s", err)
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(err))

    return PredictResponse(
        risk_level=result.risk_level,
        score=result.score,
        model_version=result.model_version,
    )