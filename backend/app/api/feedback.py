from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.services.db_service import db_service

router = APIRouter(prefix="/feedback", tags=["RLHF Feedback Collection"])

class FeedbackRequest(BaseModel):
    message_id: int
    username: str
    rating: int  # +1 or -1
    feedback_text: Optional[str] = None
    suggested_correction: Optional[str] = None

@router.post("/")
async def submit_feedback(payload: FeedbackRequest, db: AsyncSession = Depends(get_db)):
    """Logs user feedback and suggested corrections to queue for fine-tuning."""
    user = await db_service.get_or_create_user(db, payload.username, f"{payload.username}@matholy.ai")
    fb = await db_service.add_feedback(
        db, payload.message_id, user.id, payload.rating, payload.feedback_text, payload.suggested_correction
    )
    return {"status": "success", "feedback_id": fb.id}
