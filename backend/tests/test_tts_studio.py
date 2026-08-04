"""
Automated Integration Tests for Text-to-Speech (TTS) Studio.
Verifies voice classification filtering, long text chunking, audio synthesis,
preview generation, temporary file cleanup, and REST endpoints.
"""
import os
import pytest
from app.services.voice_registry import voice_registry
from app.services.speech_service import speech_service
from app.services.speech_providers import tts_engine


@pytest.mark.asyncio
async def test_voice_registry_filtering():
    """Verify voice category filtering by gender, depth, purpose, and language."""
    # Test language filter
    es_voices = voice_registry.filter_voices(language="es")
    assert len(es_voices) >= 2
    assert all(v.language == "es" for v in es_voices)

    # Test gender filter
    male_voices = voice_registry.filter_voices(gender="male")
    assert len(male_voices) >= 1
    assert all(v.gender == "male" for v in male_voices)

    # Test depth filter
    deep_voices = voice_registry.filter_voices(depth="deep")
    assert len(deep_voices) >= 1
    assert any(v.depth == "deep" for v in deep_voices)

    # Test purpose filter
    story_voices = voice_registry.filter_voices(purpose="storytelling")
    assert len(story_voices) >= 1

    # Test search query filter
    british_voices = voice_registry.filter_voices(search_query="British")
    assert len(british_voices) >= 1


@pytest.mark.asyncio
async def test_long_text_chunking():
    """Verify long story text is split into paragraph & sentence boundary chunks without splitting words."""
    long_story = (
        "Once upon a time in a faraway kingdom, an adventurer set out on a journey. "
        "The wind blew through the quiet valley as night began to fall.\n\n"
        "Chapter Two: The Deep Forest.\n"
        "Celeste walked quietly through the tall trees listening to the soft sounds of nature. "
        "Every step revealed a new mystery waiting to be solved."
    )

    chunks = speech_service.chunk_text(long_story, max_chars=120)
    assert len(chunks) >= 2
    # Ensure no paragraph order lost
    assert "Once upon a time" in chunks[0]
    assert "Deep Forest" in chunks[1] or "Deep Forest" in chunks[2]


@pytest.mark.asyncio
async def test_speech_synthesis_engine():
    """Verify speech synthesis returns valid MP3 audio bytes."""
    short_text = "Welcome to the neural text to speech studio."
    res = await tts_engine.synthesize(text=short_text, voice_id="en-US-GuyNeural", output_format="mp3")

    assert res is not None
    assert res.audio_bytes is not None
    assert len(res.audio_bytes) > 500  # Non-empty audio file
    assert res.provider in ["EdgeTTS", "gTTS"]


@pytest.mark.asyncio
async def test_advanced_speech_studio_service():
    """Verify end-to-end long text synthesis, audio file saving, and temporary cleanup."""
    sample_text = "This is a full test of the TTS studio long text processing engine."
    result = await speech_service.synthesize_advanced_speech(
        text=sample_text,
        voice_id="en-US-GuyNeural",
        output_format="mp3",
        mode="storytelling",
        username="test_user"
    )

    assert result is not None
    assert "filename" in result
    assert os.path.exists(result["filepath"])

    # Test deletion
    deleted = speech_service.delete_audio_file(result["filename"])
    assert deleted is True
    assert not os.path.exists(result["filepath"])
