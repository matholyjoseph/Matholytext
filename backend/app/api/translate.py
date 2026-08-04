"""
Translation API endpoints using the multi-provider translation engine.
Never returns fake translations. Returns clear errors when translation fails.
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional
import os
import io
import logging

from app.services.translation_engine import TranslationEngine
from app.services.nlp_service import nlp_service
from app.language_config import get_language, get_all_languages, is_supported

try:
    import docx
except ImportError:
    docx = None

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/translate", tags=["Translation"])

# Singleton translation engine
translation_engine = TranslationEngine()


class TranslationRequest(BaseModel):
    text: str
    target_lang: str
    source_lang: Optional[str] = None


class TranslationResponse(BaseModel):
    source_lang: str
    target_lang: str
    original_text: str
    translated_text: str
    provider: Optional[str] = None
    confidence: Optional[float] = None
    alternatives: Optional[list] = None
    pivot_used: Optional[bool] = False


@router.post("/", response_model=TranslationResponse)
async def translate_text(payload: TranslationRequest):
    """
    Translate text using real translation providers (Argos, MyMemory, LibreTranslate).
    Uses multi-provider fallback with English pivot for unsupported direct pairs.
    Never returns fake translations.
    """
    if not payload.text or not payload.text.strip():
        raise HTTPException(status_code=400, detail="Text to translate cannot be empty.")

    if not is_supported(payload.target_lang):
        raise HTTPException(
            status_code=400,
            detail=f"Target language '{payload.target_lang}' is not supported."
        )

    # Detect source language
    source_lang = payload.source_lang
    auto_detected = False
    if not source_lang or source_lang == "auto":
        det = nlp_service.detect_language(payload.text)
        source_lang = det["code"]
        auto_detected = True
        logger.info(
            f"[Translate] Auto-detected source language: {source_lang} "
            f"(confidence: {det.get('confidence', 'N/A')})"
        )

    if not is_supported(source_lang):
        source_lang = "en"  # Safe fallback for detection

    # Same language check
    if source_lang == payload.target_lang:
        return TranslationResponse(
            source_lang=source_lang,
            target_lang=payload.target_lang,
            original_text=payload.text,
            translated_text=payload.text,
            provider="identity",
            confidence=1.0,
        )

    logger.info(
        f"[Translate] Request: '{payload.text[:100]}...' "
        f"from {source_lang} to {payload.target_lang}"
    )

    # Try translation via multi-provider engine
    result = await translation_engine.translate(
        text=payload.text,
        source_lang=source_lang,
        target_lang=payload.target_lang,
    )

    if result:
        logger.info(
            f"[Translate] Success via {result.provider}: "
            f"'{result.text[:100]}...'"
        )
        return TranslationResponse(
            source_lang=source_lang,
            target_lang=payload.target_lang,
            original_text=payload.text,
            translated_text=result.text,
            provider=result.provider,
            confidence=result.confidence,
            alternatives=result.alternatives if result.alternatives else None,
        )

    # All providers failed
    source_name = get_language(source_lang).get("name", source_lang)
    target_name = get_language(payload.target_lang).get("name", payload.target_lang)

    logger.error(
        f"[Translate] ALL PROVIDERS FAILED: "
        f"'{payload.text[:100]}...' from {source_lang} to {payload.target_lang}"
    )

    raise HTTPException(
        status_code=503,
        detail=(
            f"Translation from {source_name} to {target_name} is currently unavailable. "
            f"All translation providers failed. Please try again later."
        )
    )


@router.post("/document/scan")
async def scan_document(file: UploadFile = File(...)):
    """Extract text from DOCX/TXT document and detect language."""
    filename = file.filename or "document.docx"
    ext = os.path.splitext(filename)[1].lower()

    content_text = ""
    paragraphs = []

    local_docx = docx
    if not local_docx:
        try:
            import docx as local_docx
        except ImportError:
            local_docx = None

    file_bytes = await file.read()

    if ext == ".docx" and local_docx:
        try:
            doc_stream = io.BytesIO(file_bytes)
            doc = local_docx.Document(doc_stream)
            for p in doc.paragraphs:
                p_text = p.text.strip()
                if p_text:
                    paragraphs.append(p_text)
            content_text = "\n\n".join(paragraphs)
        except Exception as e:
            logger.warning(f"[DocScan] DOCX parse error: {e}")
            content_text = file_bytes.decode("utf-8", errors="ignore").strip()
            paragraphs = [p.strip() for p in content_text.split("\n\n") if p.strip()]
    else:
        content_text = file_bytes.decode("utf-8", errors="ignore").strip()
        paragraphs = [p.strip() for p in content_text.split("\n\n") if p.strip()]

    if not content_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from the uploaded file.")

    detected = nlp_service.detect_language(content_text[:1000])
    words = content_text.split()

    return {
        "filename": filename,
        "char_count": len(content_text),
        "word_count": len(words),
        "paragraph_count": len(paragraphs),
        "detected_language": detected,
        "sample_text": content_text[:300] + ("..." if len(content_text) > 300 else ""),
        "full_text": content_text,
        "paragraphs": paragraphs,
    }


@router.post("/document/translate")
async def translate_docx_document(
    file: UploadFile = File(...),
    target_language: str = Form("es"),
    source_language: Optional[str] = Form("auto"),
):
    """
    Format-Preserving DOCX Document Translation Endpoint.
    Modifies text inside the uploaded DOCX XML structure directly, preserving 100% of
    layout, fonts, colors, bold/italic, tables, images, headers, footers, and RTL settings.
    """
    from app.services.docx_service import translate_docx_package, DocxValidationError

    filename = file.filename or "document.docx"
    base_name = os.path.splitext(filename)[0]
    ext = os.path.splitext(filename)[1].lower()

    if not is_supported(target_language):
        raise HTTPException(status_code=400, detail=f"Target language '{target_language}' is not supported.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    actual_source = source_language if source_language and source_language != "auto" else "auto"

    if ext == ".docx" or file_bytes.startswith(b"PK\x03\x04"):
        try:
            translated_docx_bytes = await translate_docx_package(
                docx_bytes=file_bytes,
                target_lang=target_language,
                source_lang=actual_source,
            )
            download_filename = f"{base_name}_translated_{target_language}.docx"
            return Response(
                content=translated_docx_bytes,
                media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                headers={"Content-Disposition": f"attachment; filename={download_filename}"},
            )
        except DocxValidationError as ve:
            logger.warning(f"[DocTranslate] Security/Format error: {ve}")
            raise HTTPException(status_code=400, detail=str(ve))
        except Exception as e:
            logger.error(f"[DocTranslate] Format-preserving DOCX translation error: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Failed to translate DOCX document: {str(e)}")

    # Plain text (.txt) fallback handling
    text_content = file_bytes.decode("utf-8", errors="ignore").strip()
    if not text_content:
        raise HTTPException(status_code=400, detail="No readable text content found in uploaded file.")

    if actual_source == "auto":
        det = nlp_service.detect_language(text_content[:500])
        actual_source = det["code"]

    res = await translation_engine.translate(
        text=text_content,
        source_lang=actual_source,
        target_lang=target_language,
    )
    translated_text = res.text if res else text_content

    download_filename = f"{base_name}_translated_{target_language}.txt"
    return Response(
        content=translated_text.encode("utf-8"),
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={download_filename}"},
    )


@router.get("/providers/status")
async def get_translation_provider_status():
    """Returns health status of all translation providers."""
    status = await translation_engine.get_provider_status()
    return {"providers": status}
