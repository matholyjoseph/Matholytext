"""
User correction submission endpoint.
Stores suggested translations for review — never auto-applies.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import logging
import datetime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/corrections", tags=["User Corrections"])

# In-memory store (would be DB in production)
corrections_store = []


class CorrectionRequest(BaseModel):
    original_text: str
    source_lang: str
    target_lang: str
    current_translation: str
    suggested_translation: str
    context: Optional[str] = None


@router.post("/")
async def submit_correction(payload: CorrectionRequest):
    """
    Submit a suggested better translation.
    Corrections are stored for review — never auto-applied.
    Requires validation through moderator approval or multiple confirmations.
    """
    correction = {
        "id": len(corrections_store) + 1,
        "original_text": payload.original_text,
        "source_lang": payload.source_lang,
        "target_lang": payload.target_lang,
        "current_translation": payload.current_translation,
        "suggested_translation": payload.suggested_translation,
        "context": payload.context,
        "submitted_at": datetime.datetime.utcnow().isoformat(),
        "review_status": "pending",
        "confirmation_count": 0,
    }

    corrections_store.append(correction)
    logger.info(
        f"[Correction] New suggestion #{correction['id']}: "
        f"'{payload.original_text}' ({payload.source_lang}->{payload.target_lang}) "
        f"suggested: '{payload.suggested_translation}'"
    )

    return {
        "status": "submitted",
        "correction_id": correction["id"],
        "message": "Thank you! Your suggestion has been submitted for review.",
    }


@router.get("/")
async def list_corrections(status: str = "pending"):
    """List submitted corrections (admin endpoint)."""
    filtered = [c for c in corrections_store if c["review_status"] == status]
    return {"corrections": filtered, "total": len(filtered)}
