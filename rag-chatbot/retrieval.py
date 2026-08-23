"""Retrieval and answer generation.

Two generation modes, chosen by whether LLM_API_KEY is set:

  extractive  — no API key, no cost. Returns the retrieved passage with its
                source attached. Reads as a quotation, not as advice, which
                for a health chatbot is arguably the safer default anyway.

  llm         — synthesises an answer from the retrieved chunks only, with a
                system prompt that forbids diagnosis and forbids going beyond
                the sources.

Both cite sources. Neither is allowed to answer from nothing: if retrieval
returns nothing above the similarity floor, the answer is "I don't have a
sourced answer for that" rather than an invented one. That refusal is the
most important behaviour in this file.
"""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

log = logging.getLogger(__name__)

STORE_DIR = Path(__file__).parent / "knowledge_base" / "vector_store"
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

# Cosine similarity floor. Below this the "best" match is noise, and answering
# from it is worse than admitting the gap. Tuned by hand — raise it if you see
# off-topic passages coming back, lower it if good questions get refused.
SIMILARITY_FLOOR = 0.30

TOP_K = 4

SYSTEM_PROMPT = (
    "You answer general heart-health questions for visitors to a health "
    "platform. Follow these rules absolutely:\n"
    "- Use ONLY the provided sources. If they don't contain the answer, say "
    "so and suggest speaking to a doctor.\n"
    "- Never diagnose. Never comment on an individual's symptoms.\n"
    "- Never advise starting, stopping, or changing any medication.\n"
    "- Keep answers under 150 words, in plain language.\n"
    "- Do not invent statistics or add facts absent from the sources."
)

NO_ANSWER = (
    "I don't have a sourced answer for that. A doctor can give you a proper "
    "answer, and you can also look at the CDC or MedlinePlus heart health pages."
)


@dataclass
class Passage:
    text: str
    url: str
    publisher: str
    score: float


@dataclass
class Answer:
    text: str
    sources: list[str] = field(default_factory=list)
    passages: list[Passage] = field(default_factory=list)
    mode: str = "extractive"


class Store:
    """Loads the vector store once at startup."""

    vectors: np.ndarray | None = None
    chunks: list[dict] = []
    _model = None

    @classmethod
    def load(cls) -> None:
        vectors_path = STORE_DIR / "vectors.npy"
        chunks_path = STORE_DIR / "chunks.json"

        if not vectors_path.exists() or not chunks_path.exists():
            raise FileNotFoundError(
                f"No vector store at {STORE_DIR}. Run `python ingest.py` first."
            )

        cls.vectors = np.load(vectors_path)
        cls.chunks = json.loads(chunks_path.read_text(encoding="utf-8"))
        log.info("Loaded %d chunks from %s", len(cls.chunks), STORE_DIR)

    @classmethod
    def model(cls):
        if cls._model is None:
            from sentence_transformers import SentenceTransformer
            cls._model = SentenceTransformer(EMBEDDING_MODEL)
        return cls._model

    @classmethod
    def is_ready(cls) -> bool:
        return cls.vectors is not None and bool(cls.chunks)


def retrieve(question: str, k: int = TOP_K) -> list[Passage]:
    """Cosine similarity over the whole store.

    Exhaustive rather than approximate — at a few hundred chunks this is
    sub-millisecond and exact, so there is nothing to gain from an index.
    """
    if not Store.is_ready():
        return []

    query = Store.model().encode([question], convert_to_numpy=True)[0]
    query = query / max(float(np.linalg.norm(query)), 1e-10)

    scores = Store.vectors @ query  # vectors are pre-normalised
    top = np.argsort(scores)[::-1][:k]

    passages = []
    for index in top:
        score = float(scores[index])
        if score < SIMILARITY_FLOOR:
            continue
        chunk = Store.chunks[index]
        passages.append(Passage(
            text=chunk["text"],
            url=chunk.get("url", ""),
            publisher=chunk.get("publisher", ""),
            score=round(score, 3),
        ))
    return passages


def answer(question: str) -> Answer:
    passages = retrieve(question)

    if not passages:
        return Answer(text=NO_ANSWER, mode="no-match")

    sources = []
    for passage in passages:
        if passage.url and passage.url not in sources:
            sources.append(passage.url)

    if os.environ.get("LLM_API_KEY"):
        try:
            return Answer(
                text=_generate_with_llm(question, passages),
                sources=sources, passages=passages, mode="llm",
            )
        except Exception:  # noqa: BLE001
            log.exception("LLM generation failed, falling back to extractive")

    return Answer(
        text=_generate_extractive(passages),
        sources=sources, passages=passages, mode="extractive",
    )


def _generate_extractive(passages: list[Passage]) -> str:
    """Return the best passage, attributed. No paraphrasing, no synthesis.

    Honest about what it is: this is what the source says, not an answer
    composed for you. The frontend shows the source links alongside.
    """
    best = passages[0]
    text = best.text.strip()

    if len(text) > 700:
        cutoff = text.rfind(". ", 0, 700)
        text = text[: cutoff + 1] if cutoff > 200 else text[:700] + "…"

    attribution = f"According to {best.publisher}:" if best.publisher else "From the sources:"
    return f"{attribution}\n\n{text}"


def _generate_with_llm(question: str, passages: list[Passage]) -> str:
    """Synthesise from the retrieved passages only.

    Enabled by setting LLM_API_KEY. Kept behind that check so the service is
    fully functional before anyone signs up for a provider.
    """
    import anthropic

    context = "\n\n".join(
        f"[{i + 1}] ({p.publisher}) {p.text}" for i, p in enumerate(passages)
    )

    client = anthropic.Anthropic(api_key=os.environ["LLM_API_KEY"])
    message = client.messages.create(
        model=os.environ.get("LLM_MODEL", "claude-sonnet-4-5"),
        max_tokens=500,
        system=SYSTEM_PROMPT,
        messages=[{
            "role": "user",
            "content": f"Sources:\n{context}\n\nQuestion: {question}",
        }],
    )
    return message.content[0].text