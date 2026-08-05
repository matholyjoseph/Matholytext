from fastapi import APIRouter
from pydantic import BaseModel
from app.services.nlp_service import nlp_service
from app.config import SUPPORTED_LANGUAGES

router = APIRouter(prefix="/detector", tags=["Language Detection"])

class DetectionRequest(BaseModel):
    text: str

class DetectionResponse(BaseModel):
    code: str
    name: str
    confidence: float
    script: str
    dir: str
    flag: str

@router.post("", response_model=DetectionResponse)
@router.post("/", response_model=DetectionResponse)
async def detect_language(payload: DetectionRequest):
    """Detects text language across 51 major world languages."""
    result = nlp_service.detect_language(payload.text)
    return DetectionResponse(**result)

@router.get("/supported-languages")
async def get_supported_languages():
    """Returns metadata list for all 51 supported languages."""
    return {"languages": SUPPORTED_LANGUAGES, "total": len(SUPPORTED_LANGUAGES)}
