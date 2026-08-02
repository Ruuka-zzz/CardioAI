# RAG Chatbot — Visitor-Facing Heart Health Assistant

Answers two kinds of visitor questions:
1. Platform FAQs (how CardioAI works, how to sign up)
2. General heart-health education (grounded in trusted sources, not personal diagnosis)

## How it works
1. Knowledge base built from CDC, American Heart Association, WHO, and MedlinePlus content
2. Content is chunked and embedded into a vector store
3. User question → retrieve relevant chunks → LLM answers using only retrieved content → source shown to user
4. A safety/intent check runs **before** retrieval: emergency-sounding or personal-diagnosis queries are redirected instead of answered (e.g. to emergency services or to "please sign up / consult a doctor")

- `knowledge_base/` — source documents + vector store (vector store is gitignored, see `.gitignore`)

## Planned files
- `ingest.py` — chunk + embed source documents into the vector store
- `retrieval.py` — retrieval + answer generation logic
- `intent_router.py` (or `.pl` if using Prolog for routing) — emergency/diagnosis-request detection before RAG runs
- `requirements.txt`
