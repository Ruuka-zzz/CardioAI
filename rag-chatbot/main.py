"""rag-chatbot HTTP interface.

    uvicorn main:app --reload --port 8003

Contract is fixed by backend/services/clients.py:ask_chatbot —
POST /ask takes {question} and returns {answer, sources, redirected, intent}.

The pipeline order is load-bearing and must not be rearranged:

    question -> intent gate -> [redirect]  OR  -> retrieval -> generation

An emergency question exits at the gate. It never touches the vector store,
never reaches an LLM, and never depends on retrieval quality.
"""

import logging

from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import Literal

import intent_router
import retrieval

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

app = FastAPI(title="CardioAI RAG Chatbot", version="0.1.0")


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)


class AskResponse(BaseModel):
    answer: str
    sources: list[str] = []
    redirected: bool = False
    intent: Literal["education", "faq", "diagnosis_request", "emergency"]


@app.on_event("startup")
def load_store() -> None:
    try:
        retrieval.Store.load()
                
        log.info("Embedding model loaded")
    except FileNotFoundError as err:
        log.error("%s", err)
        log.error("Retrieval will return no matches until ingest.py is run.")


@app.get("/health")
def health():
    ready = retrieval.Store.is_ready()
    return {
        "status": "ok" if ready else "degraded",
        "store_loaded": ready,
        "chunk_count": len(retrieval.Store.chunks),
    }


@app.post("/ask", response_model=AskResponse)
def ask(body: AskRequest):
    match = intent_router.classify(body.question)

    redirect = intent_router.redirect_reply(match.intent)
    if redirect is not None:
        # Logged without the question text: a visitor in crisis has not
        # consented to their words being stored, and the pattern that fired
        # is enough to audit the decision.
        log.info("Redirected %s (pattern: %s)", match.intent, match.matched_pattern)
        return AskResponse(answer=redirect, sources=[], redirected=True,
                           intent=match.intent)

    result = retrieval.answer(body.question)
    return AskResponse(
        answer=result.text,
        sources=result.sources,
        redirected=False,
        intent=match.intent,
    )
