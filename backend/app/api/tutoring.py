from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional, List

from app.database import get_db
from app.services.db_service import db_service
from app.services.llm_engine import llm_engine
from app.config import SUPPORTED_LANGUAGES

router = APIRouter(prefix="/tutoring", tags=["Language Learning & Tutoring"])

class GrammarCheckRequest(BaseModel):
    text: str
    target_language: str
    username: str

class VocabAddRequest(BaseModel):
    username: str
    word: str
    language: str
    translation: str
    example_sentence: Optional[str] = None
    context_notes: Optional[str] = None

class VocabReviewRequest(BaseModel):
    vocab_id: int
    quality_score: int  # 0 to 5

@router.post("/grammar-check")
async def check_grammar(payload: GrammarCheckRequest, db: AsyncSession = Depends(get_db)):
    """Analyzes text for grammar, punctuation, spelling mistakes, provides corrections and IPA sound guide."""
    from app.services.grammar_service import grammar_service

    user = await db_service.get_or_create_user(db, payload.username, f"{payload.username}@matholy.ai")
    
    result = await grammar_service.analyze_sentence(payload.text, payload.target_language)

    # Log to grammar correction history if error detected
    correction = await db_service.log_grammar_correction(
        db, user.id, payload.target_language, payload.text, result["corrected_text"], result["analysis_and_correction"], "grammar_check"
    )

    return {
        "original_text": payload.text,
        "corrected_text": result["corrected_text"],
        "has_errors": result["has_errors"],
        "ipa_transcription": result["ipa_transcription"],
        "phonetic_respelling": result["phonetic_respelling"],
        "analysis_and_correction": result["analysis_and_correction"],
        "log_id": correction.id
    }

@router.post("/vocab/add")
async def add_vocabulary(payload: VocabAddRequest, db: AsyncSession = Depends(get_db)):
    """Adds a new vocabulary word to user's spaced-repetition memory system."""
    user = await db_service.get_or_create_user(db, payload.username, f"{payload.username}@matholy.ai")
    vocab = await db_service.add_vocabulary(
        db, user.id, payload.word, payload.language, payload.translation, payload.example_sentence, payload.context_notes
    )
    return {"status": "success", "vocab_id": vocab.id, "word": vocab.word, "next_review_at": vocab.next_review_at.isoformat()}

@router.post("/vocab/review")
async def review_vocabulary(payload: VocabReviewRequest, db: AsyncSession = Depends(get_db)):
    """Updates SM-2 repetition statistics based on user self-evaluation quality score (0-5)."""
    vocab = await db_service.review_vocabulary(db, payload.vocab_id, payload.quality_score)
    return {
        "status": "success",
        "vocab_id": vocab.id,
        "new_interval_days": vocab.interval,
        "repetition_count": vocab.repetition_count,
        "ease_factor": round(vocab.ease_factor, 2),
        "next_review_at": vocab.next_review_at.isoformat()
    }

@router.get("/vocab/due/{username}")
async def list_due_vocab(username: str, language: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    """Retrieves vocabulary items due for review according to SM-2 spaced repetition."""
    user = await db_service.get_or_create_user(db, username, f"{username}@matholy.ai")
    items = await db_service.list_due_vocabulary(db, user.id, language)
    return {
        "due_items": [
            {
                "id": item.id,
                "word": item.word,
                "language": item.language,
                "translation": item.translation,
                "example_sentence": item.example_sentence,
                "interval": item.interval,
                "ease_factor": item.ease_factor,
                "repetition_count": item.repetition_count
            } for item in items
        ]
    }
