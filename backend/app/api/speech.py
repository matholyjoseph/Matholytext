"""
Text-to-Speech (TTS) Studio & Audio REST API.

Provides secure endpoints for:
- Voice metadata search & category filtering
- Voice audio preview generation
- Multi-provider speech synthesis with long-text chunking
- Audio file downloads & streaming
- Recent generation history & temporary file cleanup
"""
import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import tempfile
import shutil

from app.services.speech_service import speech_service
from app.services.voice_registry import voice_registry, VoiceMetadata
from app.services.speech_providers import tts_engine

router = APIRouter(prefix="/speech", tags=["Voice (STT & TTS)"])


class STTResponse(BaseModel):
    text: str
    detected_language: str


class AdvancedTTSRequest(BaseModel):
    text: str
    voice_id: str = "en-US-GuyNeural"
    rate_percent: int = Field(default=0, ge=-50, le=100)
    pitch_percent: int = Field(default=0, ge=-50, le=50)
    volume_percent: int = Field(default=0, ge=-50, le=50)
    output_format: str = "mp3"
    mode: str = "general"  # 'general', 'storytelling', 'audiobook', 'news'
    username: str = "default_user"


class PreviewRequest(BaseModel):
    voice_id: str
    sample_text: Optional[str] = None


@router.get("/voices")
async def list_voices(
    language: Optional[str] = Query(None, description="Filter by ISO language code (e.g., 'en', 'es', 'fr')"),
    gender: Optional[str] = Query(None, description="Filter by gender ('male', 'female', 'neutral')"),
    depth: Optional[str] = Query(None, description="Filter by voice depth ('deep', 'thick', 'medium', 'soft')"),
    purpose: Optional[str] = Query(None, description="Filter by purpose ('storytelling', 'audiobook', 'news', 'friendly')"),
    provider: Optional[str] = Query(None, description="Filter by provider ('EdgeTTS', 'gTTS', 'WebSpeech')"),
    is_free: Optional[bool] = Query(None, description="Filter by free/paid status"),
    search: Optional[str] = Query(None, description="Search voice names, accents, or styles")
):
    """Retrieves classified list of available voices with category metadata and filters."""
    voices = voice_registry.filter_voices(
        language=language,
        gender=gender,
        depth=depth,
        purpose=purpose,
        provider=provider,
        is_free=is_free,
        search_query=search
    )
    return {
        "total": len(voices),
        "voices": [v.dict() for v in voices]
    }


@router.post("/synthesize")
async def generate_speech(payload: AdvancedTTSRequest):
    """
    Synthesizes text into high-quality audio with long-text paragraph chunking,
    custom rate, pitch, and output format.
    """
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Text input cannot be empty.")

    if len(payload.text) > 10000:
        raise HTTPException(status_code=400, detail="Text length exceeds 10,000 character ceiling.")

    try:
        result = await speech_service.synthesize_advanced_speech(
            text=payload.text,
            voice_id=payload.voice_id,
            rate_percent=payload.rate_percent,
            pitch_percent=payload.pitch_percent,
            volume_percent=payload.volume_percent,
            output_format=payload.output_format,
            mode=payload.mode,
            username=payload.username
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Speech synthesis error: {str(e)}")


@router.post("/preview")
async def generate_voice_preview(payload: PreviewRequest):
    """Generates a short audio preview for a selected voice."""
    voice_meta = voice_registry.get_voice_by_id(payload.voice_id)
    preview_text = payload.sample_text or (voice_meta.sample_text if voice_meta else "Welcome to the Text-to-Speech studio.")

    try:
        res = await tts_engine.synthesize(text=preview_text, voice_id=payload.voice_id)
        if not res or not res.audio_bytes:
            raise HTTPException(status_code=500, detail="Failed to synthesize preview audio.")

        return Response(
            content=res.audio_bytes,
            media_type="audio/mpeg",
            headers={"Content-Disposition": "inline; filename=preview.mp3"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preview error: {str(e)}")


@router.get("/download/{filename}")
async def download_audio_file(filename: str):
    """Downloads a synthesized audio file safely."""
    clean_name = os.path.basename(filename)
    filepath = os.path.join(speech_service.temp_dir, clean_name)

    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Audio file not found or expired.")

    media_type = "audio/mpeg" if clean_name.endswith(".mp3") else "audio/wav"
    return FileResponse(
        path=filepath,
        media_type=media_type,
        filename=clean_name
    )


@router.get("/history/{username}")
async def get_recent_history(username: str):
    """Retrieves recent audio generations for the user."""
    history = speech_service.get_history(username)
    return {"history": history}


@router.delete("/audio/{filename}")
async def delete_audio(filename: str):
    """Deletes temporary audio file."""
    success = speech_service.delete_audio_file(filename)
    if not success:
        raise HTTPException(status_code=404, detail="File not found or could not be deleted.")
    return {"status": "success", "deleted_file": filename}


# Legacy STT / TTS Compatibility Routes
@router.post("/stt")
async def speech_to_text(file: UploadFile = File(...), target_language: Optional[str] = Form(None)):
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1] or ".wav")
    try:
        with open(temp_file.name, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        result = speech_service.speech_to_text(temp_file.name, target_lang=target_language)
        return result
    finally:
        if os.path.exists(temp_file.name):
            os.remove(temp_file.name)


@router.post("/tts")
async def text_to_speech_legacy(payload: Dict[str, Any]):
    text = payload.get("text", "")
    language = payload.get("language", "en")
    filepath = speech_service.text_to_speech(text, lang_code=language)
    if not filepath or not os.path.exists(filepath):
        raise HTTPException(status_code=500, detail="Failed to synthesize speech.")
    return FileResponse(path=filepath, media_type="audio/mpeg", filename=os.path.basename(filepath))
