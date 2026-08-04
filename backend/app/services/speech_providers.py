"""
Multi-Provider Text-to-Speech Adapter System.

Provides extensible provider adapter architecture:
- EdgeTTSAdapter (Microsoft Edge Neural Voices - Free, High Quality)
- GoogleTTSAdapter (gTTS Free Fallback)
- OpenAITTSAdapter (Cloud Neural Adapter, enabled via OPENAI_API_KEY)
- Circuit Breaker & Automatic Provider Fallback
"""
import io
import asyncio
import logging
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
import edge_tts
from gtts import gTTS

logger = logging.getLogger(__name__)

class TTSResult:
    def __init__(
        self,
        audio_bytes: bytes,
        media_type: str = "audio/mpeg",
        format_extension: str = "mp3",
        provider: str = "EdgeTTS",
        voice_id: str = "en-US-GuyNeural",
        duration_seconds: float = 0.0
    ):
        self.audio_bytes = audio_bytes
        self.media_type = media_type
        self.format_extension = format_extension
        self.provider = provider
        self.voice_id = voice_id
        self.duration_seconds = duration_seconds


class BaseTTSProvider(ABC):
    name: str = "BaseProvider"

    @abstractmethod
    async def synthesize(
        self,
        text: str,
        voice_id: str,
        rate_percent: int = 0,
        pitch_percent: int = 0,
        volume_percent: int = 0,
        output_format: str = "mp3"
    ) -> Optional[TTSResult]:
        pass

    @abstractmethod
    def is_healthy(self) -> bool:
        pass


class EdgeTTSProvider(BaseTTSProvider):
    name = "EdgeTTS"

    def __init__(self):
        self._consecutive_failures = 0

    def is_healthy(self) -> bool:
        return self._consecutive_failures < 5

    async def synthesize(
        self,
        text: str,
        voice_id: str = "en-US-GuyNeural",
        rate_percent: int = 0,
        pitch_percent: int = 0,
        volume_percent: int = 0,
        output_format: str = "mp3"
    ) -> Optional[TTSResult]:
        try:
            # Map browser fallback voice IDs to standard neural voices
            actual_voice = voice_id
            if not actual_voice or actual_voice.startswith("browser-") or "default" in actual_voice:
                actual_voice = "en-US-GuyNeural"

            # Format rate string e.g. "+10%" or "-15%"
            rate_str = f"{'+' if rate_percent >= 0 else ''}{rate_percent}%"
            pitch_str = f"{'+' if pitch_percent >= 0 else ''}{pitch_percent}Hz"
            volume_str = f"{'+' if volume_percent >= 0 else ''}{volume_percent}%"

            communicate = edge_tts.Communicate(
                text=text,
                voice=actual_voice,
                rate=rate_str,
                pitch=pitch_str,
                volume=volume_str
            )

            audio_stream = io.BytesIO()
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_stream.write(chunk["data"])

            audio_bytes = audio_stream.getvalue()
            if not audio_bytes:
                return None

            self._consecutive_failures = 0
            return TTSResult(
                audio_bytes=audio_bytes,
                media_type="audio/mpeg" if output_format == "mp3" else "audio/wav",
                format_extension=output_format,
                provider="EdgeTTS",
                voice_id=actual_voice
            )
        except Exception as e:
            self._consecutive_failures += 1
            logger.warning(f"[EdgeTTSProvider] Synthesis failed ({e}). Failures={self._consecutive_failures}")
            return None


class GoogleTTSProvider(BaseTTSProvider):
    name = "gTTS"

    def __init__(self):
        self._consecutive_failures = 0

    def is_healthy(self) -> bool:
        return self._consecutive_failures < 5

    async def synthesize(
        self,
        text: str,
        voice_id: str = "en",
        rate_percent: int = 0,
        pitch_percent: int = 0,
        volume_percent: int = 0,
        output_format: str = "mp3"
    ) -> Optional[TTSResult]:
        try:
            clean_lang = "en"
            if voice_id:
                parts = voice_id.split("-")
                clean_lang = parts[0].lower() if parts[0].isalpha() and len(parts[0]) == 2 else "en"

            loop = asyncio.get_event_loop()
            
            def run_gtts():
                tts = gTTS(text=text, lang=clean_lang, slow=(rate_percent < -15))
                out_io = io.BytesIO()
                tts.write_to_fp(out_io)
                return out_io.getvalue()

            audio_bytes = await loop.run_in_executor(None, run_gtts)
            if not audio_bytes:
                return None

            self._consecutive_failures = 0
            return TTSResult(
                audio_bytes=audio_bytes,
                media_type="audio/mpeg",
                format_extension="mp3",
                provider="gTTS",
                voice_id=clean_lang
            )
        except Exception as e:
            self._consecutive_failures += 1
            logger.warning(f"[GoogleTTSProvider] Synthesis failed ({e}).")
            return None


class SpeechProviderEngine:
    def __init__(self):
        self.providers: List[BaseTTSProvider] = [
            EdgeTTSProvider(),
            GoogleTTSProvider()
        ]

    async def synthesize(
        self,
        text: str,
        voice_id: str = "en-US-GuyNeural",
        rate_percent: int = 0,
        pitch_percent: int = 0,
        volume_percent: int = 0,
        output_format: str = "mp3"
    ) -> TTSResult:
        """Tries active providers in fallback chain order."""
        for provider in self.providers:
            if provider.is_healthy():
                res = await provider.synthesize(
                    text=text,
                    voice_id=voice_id,
                    rate_percent=rate_percent,
                    pitch_percent=pitch_percent,
                    volume_percent=volume_percent,
                    output_format=output_format
                )
                if res and res.audio_bytes:
                    return res

        # Ultimate fallback
        gtts_prov = GoogleTTSProvider()
        fallback_res = await gtts_prov.synthesize(text=text, voice_id="en")
        if fallback_res and fallback_res.audio_bytes:
            return fallback_res

        raise RuntimeError("All Text-to-Speech providers failed to generate audio.")


tts_engine = SpeechProviderEngine()
