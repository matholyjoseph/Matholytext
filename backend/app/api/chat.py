from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List, Optional
import json

from app.database import get_db
from app.services.db_service import db_service
from app.services.llm_engine import llm_engine
from app.services.nlp_service import nlp_service

router = APIRouter(prefix="/chat", tags=["Multilingual Chat"])

class CreateConversationRequest(BaseModel):
    username: str
    email: str
    target_language: str = "es"
    mode: str = "general"
    title: Optional[str] = "New Chat"

class MessageRequest(BaseModel):
    conversation_id: int
    content: str

@router.post("/conversation")
async def create_conversation(payload: CreateConversationRequest, db: AsyncSession = Depends(get_db)):
    user = await db_service.get_or_create_user(db, payload.username, payload.email)
    conv = await db_service.create_conversation(db, user.id, payload.title, payload.target_language, payload.mode)
    return {"status": "success", "conversation_id": conv.id, "target_language": conv.target_language, "mode": conv.mode}

@router.get("/conversations/{username}")
async def list_conversations(username: str, db: AsyncSession = Depends(get_db)):
    user = await db_service.get_or_create_user(db, username, f"{username}@matholy.ai")
    convs = await db_service.list_conversations(db, user.id)
    return {"conversations": [{"id": c.id, "title": c.title, "target_language": c.target_language, "mode": c.mode, "created_at": c.created_at.isoformat()} for c in convs]}

@router.get("/messages/{conversation_id}")
async def get_messages(conversation_id: int, db: AsyncSession = Depends(get_db)):
    msgs = await db_service.get_messages(db, conversation_id)
    return {
        "messages": [
            {
                "id": m.id,
                "sender": m.sender,
                "content": m.content,
                "detected_language": m.detected_language,
                "translation": m.translation,
                "rating": m.rating,
                "created_at": m.created_at.isoformat()
            } for m in msgs
        ]
    }

@router.post("/message")
async def send_message(payload: MessageRequest, db: AsyncSession = Depends(get_db)):
    """Sends a user message, detects language, and generates an AI response."""
    det = nlp_service.detect_language(payload.content)
    
    # Save user message
    user_msg = await db_service.add_message(
        db, payload.conversation_id, sender="user", content=payload.content, detected_lang=det["code"]
    )

    # Get conversation context
    msgs = await db_service.get_messages(db, payload.conversation_id)
    formatted_history = [{"role": m.sender, "content": m.content} for m in msgs]

    # Assume conversation target language from context or last message
    conv = msgs[0].conversation if msgs else None
    target_lang = conv.target_language if conv else det["code"]
    mode = conv.mode if conv else "general"

    # Generate response
    ai_text = llm_engine.generate_response(formatted_history, target_lang=target_lang, mode=mode)

    # Save assistant message
    ai_msg = await db_service.add_message(
        db, payload.conversation_id, sender="assistant", content=ai_text, detected_lang=target_lang
    )

    return {
        "user_message": {"id": user_msg.id, "content": user_msg.content, "detected_language": det["code"]},
        "assistant_message": {"id": ai_msg.id, "content": ai_msg.content, "detected_language": target_lang}
    }

@router.post("/message/stream")
async def stream_message(payload: MessageRequest, db: AsyncSession = Depends(get_db)):
    """Streams the AI response using Server-Sent Events (SSE)."""
    det = nlp_service.detect_language(payload.content)
    user_msg = await db_service.add_message(
        db, payload.conversation_id, sender="user", content=payload.content, detected_lang=det["code"]
    )

    msgs = await db_service.get_messages(db, payload.conversation_id)
    formatted_history = [{"role": m.sender, "content": m.content} for m in msgs]
    conv = msgs[0].conversation if msgs else None
    target_lang = conv.target_language if conv else det["code"]
    mode = conv.mode if conv else "general"

    async def event_generator():
        full_response = ""
        async for chunk in llm_engine.stream_response(formatted_history, target_lang=target_lang, mode=mode):
            full_response += chunk
            yield f"data: {json.dumps({'text': chunk})}\n\n"
        
        # Save assistant message when complete
        await db_service.add_message(
            db, payload.conversation_id, sender="assistant", content=full_response, detected_lang=target_lang
        )
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
