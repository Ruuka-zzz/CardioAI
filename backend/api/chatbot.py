"""Visitor chatbot. Public, unauthenticated, and touches no patient data.

A thin proxy to rag-chatbot. The intent gate and retrieval both live in that
service, so this module deliberately holds no logic — nothing here should ever
grow a database query.
"""

from fastapi import APIRouter

from schemas import ChatRequest, ChatResponse
from services import clients

router = APIRouter(prefix="/api/chat", tags=["chatbot"])


@router.post("", response_model=ChatResponse)
def ask(body: ChatRequest):
    data = clients.ask_chatbot(body.question)
    return ChatResponse(
        answer=data["answer"],
        sources=data.get("sources", []),
        redirected=data.get("redirected", False),
        intent=data.get("intent", "education"),
    )