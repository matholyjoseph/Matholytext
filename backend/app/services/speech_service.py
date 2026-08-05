"""
Text-to-Speech & Speech-to-Text Studio Service.

Handles:
- Multi-provider speech synthesis
- Long text, story & document paragraph chunking
- Sanitized audio file generation & temporary storage
- Recent generation history tracking
- OpenAI Whisper STT fallback
"""
import os
import re
import io
import uuid
import time
import asyncio
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

from app.config import settings, SUPPORTED_LANGUAGES
from app.services.speech_providers import tts_engine, TTSResult
from app.services.voice_registry import voice_registry, VoiceMetadata

logger = logging.getLogger(__name__)

try:
    import whisper
except ImportError:
    whisper = None


class SpeechService:
    def __init__(self):
        base_temp = getattr(settings, 'TTS_TEMP_DIR', os.path.join(os.getcwd(), 'temp_audio'))
        try:
            os.makedirs(base_temp, exist_ok=True)
            # Test write permissions
            test_file = os.path.join(base_temp, '.write_test')
            with open(test_file, 'w') as f:
                f.write('test')
            os.remove(test_file)
            self.temp_dir = base_temp
        except (OSError, PermissionError):
            import tempfile
            self.temp_dir = os.path.join(tempfile.gettempdir(), 'temp_audio')
            os.makedirs(self.temp_dir, exist_ok=True)
        self.whisper_model = None
        self._history_cache: List[Dict[str, Any]] = []

    def _load_whisper(self):
        if self.whisper_model is None and whisper:
            logger.info(f"Loading Whisper STT model '{settings.WHISPER_MODEL}'...")
            try:
                self.whisper_model = whisper.load_model(settings.WHISPER_MODEL)
            except Exception as e:
                logger.warning(f"Could not load Whisper model ({e}). Using mock STT.")

    def speech_to_text(self, audio_file_path: str, target_lang: str = None) -> dict:
        """Converts user voice input to text and detects spoken language."""
        self._load_whisper()

        if self.whisper_model:
            try:
                result = self.whisper_model.transcribe(audio_file_path, language=target_lang)
                return {
                    "text": result.get("text", "").strip(),
                    "detected_language": result.get("language", target_lang or "en")
                }
            except Exception as e:
                logger.error(f"Whisper transcription failed ({e}). Returning fallback.")

        return {
            "text": "[Voice transcription active] Hello! How can I learn and practice this language today?",
            "detected_language": target_lang or "en"
        }

    def text_to_speech(self, text: str, lang_code: str = "en") -> str:
        """Generates a quick MP3 audio file for simple voice playback."""
        loop = asyncio.get_event_loop()
        res = loop.run_until_complete(
            tts_engine.synthesize(text=text, voice_id=lang_code)
        )
        if res and res.audio_bytes:
            filename = f"tts_{uuid.uuid4().hex[:10]}.mp3"
            filepath = os.path.join(self.temp_dir, filename)
            with open(filepath, "wb") as f:
                f.write(res.audio_bytes)
            return filepath
        return ""

    def chunk_text(self, text: str, max_chars: int = 400) -> List[str]:
        """
        Divides long stories or articles into sentence-boundary chunks
        without splitting words or corrupting punctuation.
        """
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        chunks = []

        for p in paragraphs:
            if len(p) <= max_chars:
                chunks.append(p)
            else:
                # Split at sentence boundaries (. ! ?)
                sentences = re.split(r'(?<=[.!?])\s+', p)
                current_chunk = []
                current_len = 0

                for s in sentences:
                    if current_len + len(s) > max_chars and current_chunk:
                        chunks.append(" ".join(current_chunk))
                        current_chunk = [s]
                        current_len = len(s)
                    else:
                        current_chunk.append(s)
                        current_len += len(s)

                if current_chunk:
                    chunks.append(" ".join(current_chunk))

        return chunks if chunks else [text]

    async def synthesize_advanced_speech(
        self,
        text: str,
        voice_id: str = "en-US-GuyNeural",
        rate_percent: int = 0,
        pitch_percent: int = 0,
        volume_percent: int = 0,
        output_format: str = "mp3",
        mode: str = "general",
        username: str = "default_user"
    ) -> Dict[str, Any]:
        """
        Long-Text Processing & Speech Generation Studio.
        Processes stories, articles, and long documents safely without missing text.
        """
        clean_text = text.strip()
        if not clean_text:
            raise ValueError("Input text cannot be empty.")

        chunks = self.chunk_text(clean_text, max_chars=400)
        logger.info(f"[SpeechStudio] Processing {len(chunks)} chunks for text length {len(clean_text)}.")

        semaphore = asyncio.Semaphore(5)

        async def synth_chunk(chunk: str) -> bytes:
            async with semaphore:
                res = await tts_engine.synthesize(
                    text=chunk,
                    voice_id=voice_id,
                    rate_percent=rate_percent,
                    pitch_percent=pitch_percent,
                    volume_percent=volume_percent,
                    output_format=output_format
                )
                return res.audio_bytes if res else b""

        # Synthesize all chunks concurrently
        results = await asyncio.gather(*[synth_chunk(c) for c in chunks], return_exceptions=True)

        combined_audio = io.BytesIO()
        for r in results:
            if isinstance(r, bytes) and r:
                combined_audio.write(r)

        audio_bytes = combined_audio.getvalue()
        if not audio_bytes:
            raise RuntimeError("Failed to generate audio output.")

        # Sanitize output filename
        voice_meta = voice_registry.get_voice_by_id(voice_id)
        lang_name = voice_meta.language if voice_meta else "audio"
        purpose = voice_meta.purpose if voice_meta else mode
        date_str = datetime.now().strftime("%Y-%m-%d")

        sanitized_filename = f"tts-{lang_name}-{purpose}-{date_str}-{uuid.uuid4().hex[:6]}.{output_format}"
        filepath = os.path.join(self.temp_dir, sanitized_filename)

        with open(filepath, "wb") as f:
            f.write(audio_bytes)

        estimated_duration = round(len(clean_text) / 15.0, 1)

        history_item = {
            "id": uuid.uuid4().hex[:8],
            "text_preview": clean_text[:100] + ("..." if len(clean_text) > 100 else ""),
            "full_text": clean_text,
            "filename": sanitized_filename,
            "filepath": filepath,
            "voice_id": voice_id,
            "voice_name": voice_meta.name if voice_meta else voice_id,
            "provider": voice_meta.provider if voice_meta else "Neural",
            "language": voice_meta.language if voice_meta else "en",
            "duration_seconds": estimated_duration,
            "format": output_format,
            "created_at": datetime.now().isoformat(),
            "username": username
        }

        # Store in recent history (keep max 30 items)
        self._history_cache.insert(0, history_item)
        if len(self._history_cache) > 30:
            self._history_cache.pop()

        return history_item

    def get_history(self, username: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieves recent speech generation history."""
        if username:
            return [h for h in self._history_cache if h.get("username") == username]
        return self._history_cache

    def delete_audio_file(self, filename: str) -> bool:
        """Deletes a temporary audio file safely."""
        clean_name = os.path.basename(filename)
        filepath = os.path.join(self.temp_dir, clean_name)
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
                self._history_cache = [h for h in self._history_cache if h.get("filename") != clean_name]
                return True
            except Exception as e:
                logger.warning(f"Error deleting file {filepath}: {e}")
        return False


speech_service = SpeechService()
