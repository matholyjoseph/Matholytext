import hashlib
import logging
from typing import Optional, List, Dict, Any

from app.services.translation_providers import (
    TranslationResult,
    ArgosProvider,
    GoogleTranslateProvider,
    MyMemoryProvider,
    LibreTranslateProvider,
    OfflineFallbackProvider
)
from app.language_config import is_supported

logger = logging.getLogger(__name__)

class TranslationEngine:
    def __init__(self):
        # 1. GoogleTranslateProvider — fast, free online via deep-translator (0.6s)
        # 2. OfflineFallbackProvider — 100% instant offline dictionary & phrase fallback (0.0001s)
        # 3. ArgosProvider / MyMemoryProvider / LibreTranslateProvider — secondary fallbacks
        self.providers = [
            GoogleTranslateProvider(),
            OfflineFallbackProvider(),
            ArgosProvider(),
            MyMemoryProvider(),
            LibreTranslateProvider()
        ]
        self.cache = {}

    def _get_cache_key(self, text: str, source_lang: str, target_lang: str) -> str:
        text_hash = hashlib.md5(text.encode("utf-8")).hexdigest()
        return f"{text_hash}_{source_lang}_{target_lang}"

    def _validate_translation(self, original: str, translated: str, source_lang: str, target_lang: str) -> bool:
        if not translated or not translated.strip():
            return False
        if source_lang != target_lang and original.strip().lower() == translated.strip().lower():
            # If languages are different, and translation is identical, it's often a failure or non-translation
            # Exception can be made for numbers or short names, but generally return False for now
            if any(c.isalpha() for c in original):
                return False
        if translated.strip() == f"{original.strip()} {original.strip()[-1]}":
            return False
        return True

    async def translate(self, text: str, source_lang: str, target_lang: str, source_lang_auto: bool = False) -> Optional[TranslationResult]:
        if not text or not text.strip():
            return None

        # Detect source if requested (placeholder, as actual langdetect is not specified)
        if source_lang_auto:
            pass # Not implemented yet

        if not is_supported(source_lang) or not is_supported(target_lang):
            logger.warning(f"Unsupported language pair: {source_lang} -> {target_lang}")
            return None

        if source_lang == target_lang:
            return TranslationResult(
                text=text,
                source_lang=source_lang,
                target_lang=target_lang,
                provider="identity"
            )

        cache_key = self._get_cache_key(text, source_lang, target_lang)
        if cache_key in self.cache:
            return self.cache[cache_key]

        # Try providers for direct translation
        import asyncio
        for provider in self.providers:
            if provider.supports_pair(source_lang, target_lang):
                try:
                    result = await asyncio.wait_for(
                        provider.translate(text, source_lang, target_lang),
                        timeout=15
                    )
                except asyncio.TimeoutError:
                    logger.warning(f"[Engine] Provider {provider.name} timed out for {source_lang}->{target_lang}")
                    result = None
                except Exception as exc:
                    logger.error(f"[Engine] Provider {provider.name} raised: {exc}")
                    result = None
                if result and self._validate_translation(text, result.text, source_lang, target_lang):
                    self.cache[cache_key] = result
                    return result

        # Try English pivot if direct translation fails
        if source_lang != "en" and target_lang != "en":
            logger.info(f"Attempting English pivot for {source_lang} -> {target_lang}")
            # Source -> EN
            en_result = None
            for provider in self.providers:
                if provider.supports_pair(source_lang, "en"):
                    try:
                        res = await asyncio.wait_for(
                            provider.translate(text, source_lang, "en"),
                            timeout=15
                        )
                    except Exception as exc:
                        logger.warning(f"[Engine] Pivot src->en {provider.name} failed/timed out: {exc}")
                        res = None
                    if res and self._validate_translation(text, res.text, source_lang, "en"):
                        en_result = res
                        break
            
            # EN -> Target
            if en_result:
                for provider in self.providers:
                    if provider.supports_pair("en", target_lang):
                        try:
                            final_res = await asyncio.wait_for(
                                provider.translate(en_result.text, "en", target_lang),
                                timeout=15
                            )
                        except Exception as exc:
                            logger.warning(f"[Engine] Pivot en->tgt {provider.name} failed/timed out: {exc}")
                            final_res = None
                        if final_res and self._validate_translation(en_result.text, final_res.text, "en", target_lang):
                            final_res.source_lang = source_lang
                            self.cache[cache_key] = final_res
                            return final_res

        logger.error(f"Failed to translate '{text}' from {source_lang} to {target_lang}")
        return None

    async def get_provider_status(self) -> List[Dict[str, Any]]:
        status = []
        for p in self.providers:
            status.append({
                "provider": p.name,
                "healthy": p.is_healthy(),
                "consecutive_failures": p.consecutive_failures
            })
        return status


# Singleton instance
translation_engine = TranslationEngine()

