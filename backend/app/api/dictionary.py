from fastapi import APIRouter, HTTPException, Query
from app.services.dictionary_service import dictionary_service

router = APIRouter(prefix="/dictionary", tags=["Dictionary"])


@router.get("/lookup")
async def lookup_dictionary_word(
    word: str = Query(..., description="Word to look up"),
    language: str = Query("en", description="Language code (ISO 639-1)")
):
    """
    Look up a word in real dictionary APIs (Free Dictionary API, Wiktionary).
    Returns definitions, IPA pronunciation, audio, part of speech, synonyms, antonyms.
    Never fabricates data — returns honest 'not found' if word is unavailable.
    """
    if not word or not word.strip():
        raise HTTPException(status_code=400, detail="Word parameter is required.")

    result = await dictionary_service.lookup_word(word.strip(), language)
    return result
