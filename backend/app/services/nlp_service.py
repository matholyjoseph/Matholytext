import re
import datetime
from typing import Dict, Any, List, Tuple
from app.config import SUPPORTED_LANGUAGES

try:
    from langdetect import detect, detect_langs
except ImportError:
    detect = None

class MultilingualNLPService:
    def __init__(self):
        self.script_patterns = {
            "Han": re.compile(r'[\u4e00-\u9fff]'),
            "Devanagari": re.compile(r'[\u0900-\u097F]'),
            "Arabic": re.compile(r'[\u0600-\u06FF]'),
            "Bengali": re.compile(r'[\u0980-\u09FF]'),
            "Cyrillic": re.compile(r'[\u0400-\u04FF]'),
            "Japanese": re.compile(r'[\u3040-\u30FF\u4e00-\u9fff]'),
            "Hangul": re.compile(r'[\uac00-\ud7af]'),
            "Telugu": re.compile(r'[\u0c00-\u0c7f]'),
            "Tamil": re.compile(r'[\u0b80-\u0bff]'),
            "Thai": re.compile(r'[\u0e00-\u0e7f]'),
            "Gujarati": re.compile(r'[\u0a80-\u0aff]'),
            "Greek": re.compile(r'[\u0370-\u03ff]'),
            "Hebrew": re.compile(r'[\u0590-\u05ff]'),
            "Ethiopic": re.compile(r'[\u1200-\u137f]'),
            "Gurmukhi": re.compile(r'[\u0a00-\u0a7f]'),
            "Sinhala": re.compile(r'[\u0d80-\u0dff]'),
        }

    def detect_language(self, text: str) -> Dict[str, Any]:
        """Detects language with script analysis fallback and confidence scores."""
        if not text or not text.strip():
            return {"code": "en", "confidence": 1.0, "name": "English", "script": "Latin"}

        # 1. Check Unicode Scripts
        for script_name, regex in self.script_patterns.items():
            if regex.search(text):
                # Map script to likely language
                script_to_lang = {
                    "Han": "zh",
                    "Devanagari": "hi",
                    "Arabic": "ar",
                    "Bengali": "bn",
                    "Cyrillic": "ru",
                    "Japanese": "ja",
                    "Hangul": "ko",
                    "Telugu": "te",
                    "Tamil": "ta",
                    "Thai": "th",
                    "Gujarati": "gu",
                    "Greek": "el",
                    "Hebrew": "he",
                    "Ethiopic": "am",
                    "Gurmukhi": "pa",
                    "Sinhala": "si",
                }
                lang_code = script_to_lang.get(script_name, "en")
                lang_meta = SUPPORTED_LANGUAGES.get(lang_code, SUPPORTED_LANGUAGES["en"])
                return {
                    "code": lang_code,
                    "confidence": 0.95,
                    "name": lang_meta["name"],
                    "script": script_name,
                    "dir": lang_meta["dir"],
                    "flag": lang_meta["flag"]
                }

        # 2. Use langdetect if available
        if detect:
            try:
                lang_code = detect(text)
                if lang_code in SUPPORTED_LANGUAGES:
                    lang_meta = SUPPORTED_LANGUAGES[lang_code]
                    return {
                        "code": lang_code,
                        "confidence": 0.85,
                        "name": lang_meta["name"],
                        "script": lang_meta["script"],
                        "dir": lang_meta["dir"],
                        "flag": lang_meta["flag"]
                    }
            except Exception:
                pass

        # 3. Default to English
        return {
            "code": "en",
            "confidence": 0.50,
            "name": "English",
            "script": "Latin",
            "dir": "ltr",
            "flag": "🇬🇧"
        }

    def compute_sm2_review(self, quality: int, repetition_count: int, interval: int, ease_factor: float) -> Tuple[int, int, float, datetime.datetime]:
        """Calculates SuperMemo SM-2 Spaced Repetition parameters for vocabulary learning.
        quality: 0 (total blackout) to 5 (perfect recall).
        """
        quality = max(0, min(5, quality))

        if quality >= 3:
            if repetition_count == 0:
                new_interval = 1
            elif repetition_count == 1:
                new_interval = 6
            else:
                new_interval = int(interval * ease_factor)
            new_repetition_count = repetition_count + 1
        else:
            new_repetition_count = 0
            new_interval = 1

        new_ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        if new_ease_factor < 1.3:
            new_ease_factor = 1.3

        next_review_at = datetime.datetime.utcnow() + datetime.timedelta(days=new_interval)
        return new_repetition_count, new_interval, new_ease_factor, next_review_at

nlp_service = MultilingualNLPService()
