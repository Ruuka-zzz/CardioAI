"""Build the vector store from sources.yaml.

    python ingest.py              # fetch, chunk, embed
    python ingest.py --offline    # re-embed from already-fetched text

Fetches each source, strips it to readable text, chunks it, embeds the chunks,
and writes a numpy store to knowledge_base/vector_store/.

WHY NOT CHROMADB OR FAISS
-------------------------
The knowledge base is a few hundred chunks. A numpy array plus cosine
similarity is exact, instant at this size, has no database process to run, and
can be inspected with three lines of Python when a retrieval looks wrong. A
vector database earns its complexity at a scale this project will not reach.

WHY EMBEDDINGS ARE LOCAL
------------------------
sentence-transformers runs on CPU with no API key and no per-request cost.
The model downloads once (~90 MB). This is what lets the whole chatbot work
before you have an LLM provider.

AUDITABILITY
------------
Raw fetched text is kept in knowledge_base/raw/ with its retrieval date, as
knowledge_base/README.md requires. It is gitignored — regenerate rather than
commit it — but it means you can always check what a given answer was drawn
from.
"""

from __future__ import annotations

import argparse
import json
import re
from datetime import date
from pathlib import Path

import numpy as np
import yaml

BASE = Path(__file__).parent / "knowledge_base"
SOURCES_FILE = BASE / "sources.yaml"
RAW_DIR = BASE / "raw"
FAQ_DIR = BASE / "faq"
STORE_DIR = BASE / "vector_store"

EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

# ~600 characters with 100 of overlap. Long enough that a paragraph about
# symptoms stays intact; short enough that a retrieved chunk is mostly signal.
CHUNK_SIZE = 600
CHUNK_OVERLAP = 100


def fetch(url: str) -> str:
    """Download a page and reduce it to readable text."""
    import httpx
    from bs4 import BeautifulSoup

    response = httpx.get(url, timeout=30.0, follow_redirects=True,
                         headers={"User-Agent": "CardioAI-ingest/0.1 (student project)"})
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    # Navigation, scripts, and cookie banners are noise that would otherwise
    # be embedded and retrieved as if it were health content.
    for tag in soup(["script", "style", "nav", "header", "footer", "aside", "form"]):
        tag.decompose()

    main = soup.find("main") or soup.find("article") or soup.body or soup
    text = main.get_text(separator="\n")

    lines = [line.strip() for line in text.splitlines()]
    lines = [line for line in lines if len(line) > 2]
    return re.sub(r"\n{3,}", "\n\n", "\n".join(lines))


def chunk(text: str) -> list[str]:
    """Split on paragraph boundaries, packing up to CHUNK_SIZE.

    Splitting mid-sentence produces chunks that retrieve well and read badly,
    which matters here because the extractive generator shows them verbatim.
    """
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks: list[str] = []
    current = ""

    for paragraph in paragraphs:
        if len(current) + len(paragraph) + 2 <= CHUNK_SIZE:
            current = f"{current}\n\n{paragraph}" if current else paragraph
        else:
            if current:
                chunks.append(current)
            if len(paragraph) > CHUNK_SIZE:
                # A single oversized paragraph — fall back to a sliding window.
                step = CHUNK_SIZE - CHUNK_OVERLAP
                for i in range(0, len(paragraph), step):
                    chunks.append(paragraph[i:i + CHUNK_SIZE])
                current = ""
            else:
                current = paragraph

    if current:
        chunks.append(current)

    return [c for c in chunks if len(c) > 80]  # drop stubs


def load_sources() -> list[dict]:
    config = yaml.safe_load(SOURCES_FILE.read_text(encoding="utf-8"))
    return config["sources"]


def gather(offline: bool) -> list[dict]:
    """Return every chunk with its provenance attached."""
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    records: list[dict] = []

    for source in load_sources():
        raw_path = RAW_DIR / f"{source['id']}.txt"

        if offline or raw_path.exists():
            if not raw_path.exists():
                print(f"  skip {source['id']} (no cached text)")
                continue
            text = raw_path.read_text(encoding="utf-8")
            print(f"  cached {source['id']}")
        else:
            try:
                text = fetch(source["url"])
                raw_path.write_text(text, encoding="utf-8")
                print(f"  fetched {source['id']} ({len(text)} chars)")
            except Exception as err:  # noqa: BLE001
                print(f"  FAILED {source['id']}: {err}")
                continue

        for i, piece in enumerate(chunk(text)):
            records.append({
                "text": piece,
                "source_id": source["id"],
                "url": source["url"],
                "publisher": source["publisher"],
                "licence": source["licence"],
                "chunk_index": i,
                "retrieved": date.today().isoformat(),
            })

    # Team-written platform FAQs, ingested alongside the external sources so
    # one retrieval covers both "what is atrial fibrillation" and "how do I
    # sign up".
    if FAQ_DIR.exists():
        for path in sorted(FAQ_DIR.glob("*.md")):
            for i, piece in enumerate(chunk(path.read_text(encoding="utf-8"))):
                records.append({
                    "text": piece,
                    "source_id": f"faq-{path.stem}",
                    "url": "",
                    "publisher": "CardioAI",
                    "licence": "internal",
                    "chunk_index": i,
                    "retrieved": date.today().isoformat(),
                })
            print(f"  faq {path.name}")

    return records


def embed(texts: list[str]) -> np.ndarray:
    from sentence_transformers import SentenceTransformer

    print(f"Loading embedding model ({EMBEDDING_MODEL})...")
    model = SentenceTransformer(EMBEDDING_MODEL)

    print(f"Embedding {len(texts)} chunks...")
    vectors = model.encode(texts, show_progress_bar=True, convert_to_numpy=True)

    # Normalise once here so retrieval is a plain dot product later.
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    return vectors / np.clip(norms, 1e-10, None)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--offline", action="store_true",
                        help="Re-embed cached text without fetching")
    args = parser.parse_args()

    print("Gathering sources...")
    records = gather(args.offline)

    if not records:
        raise SystemExit(
            "No content gathered. Check your connection, or run with --offline "
            "if you already have knowledge_base/raw/ populated."
        )

    vectors = embed([r["text"] for r in records])

    STORE_DIR.mkdir(parents=True, exist_ok=True)
    np.save(STORE_DIR / "vectors.npy", vectors)
    (STORE_DIR / "chunks.json").write_text(
        json.dumps(records, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    (STORE_DIR / "meta.json").write_text(
        json.dumps({
            "model": EMBEDDING_MODEL,
            "chunk_count": len(records),
            "built": date.today().isoformat(),
            "sources": sorted({r["source_id"] for r in records}),
        }, indent=2),
        encoding="utf-8",
    )

    print(f"\nStored {len(records)} chunks in {STORE_DIR}")
    print("Next: uvicorn main:app --reload --port 8003")


if __name__ == "__main__":
    main()