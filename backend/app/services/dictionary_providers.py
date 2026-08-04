"""
Dictionary providers that fetch REAL data from free, legal dictionary APIs.
Never fabricates definitions, IPA, or translations.
"""
import logging
import re
from typing import Dict, Any, Optional, List
from abc import ABC, abstractmethod

import httpx

logger = logging.getLogger(__name__)

# Timeout for all external API calls
DICT_TIMEOUT = 10.0


class DictionaryResult:
    """Structured result from a dictionary lookup."""
    def __init__(self):
        self.word: str = ""
        self.language: str = "en"
        self.phonetic: str = ""  # IPA pronunciation
        self.audio_url: str = ""  # URL to audio pronunciation
        self.definitions: List[Dict[str, Any]] = []  # [{part_of_speech, definition, example, synonyms, antonyms}]
        self.source: str = ""  # attribution
        self.source_url: str = ""
        self.found: bool = False
        self.error: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "word": self.word,
            "language": self.language,
            "phonetic": self.phonetic,
            "audio_url": self.audio_url,
            "definitions": self.definitions,
            "source": self.source,
            "source_url": self.source_url,
            "found": self.found,
            "error": self.error,
        }


class DictionaryProvider(ABC):
    """Abstract base class for dictionary providers."""
    name: str = "base"

    @abstractmethod
    async def lookup(self, word: str, language: str = "en") -> Optional[DictionaryResult]:
        pass


class FreeDictionaryProvider(DictionaryProvider):
    """
    Uses the Free Dictionary API (https://dictionaryapi.dev).
    Free, no API key required. English only.
    License: CC BY-SA 3.0
    """
    name = "free_dictionary_api"
    BASE_URL = "https://api.dictionaryapi.dev/api/v2/entries"

    # Supported languages by Free Dictionary API
    SUPPORTED_LANGS = {"en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "ar", "hi", "tr"}

    async def lookup(self, word: str, language: str = "en") -> Optional[DictionaryResult]:
        if language not in self.SUPPORTED_LANGS:
            return None

        result = DictionaryResult()
        result.word = word
        result.language = language
        result.source = "Free Dictionary API"
        result.source_url = "https://dictionaryapi.dev"

        url = f"{self.BASE_URL}/{language}/{word}"

        try:
            async with httpx.AsyncClient(timeout=DICT_TIMEOUT) as client:
                response = await client.get(url)

            if response.status_code == 404:
                result.error = f"Word '{word}' not found in {language} dictionary."
                logger.info(f"[FreeDictionary] '{word}' ({language}): not found (404)")
                return result

            if response.status_code != 200:
                logger.warning(f"[FreeDictionary] '{word}' ({language}): HTTP {response.status_code}")
                return None

            data = response.json()
            if not data or not isinstance(data, list):
                return None

            entry = data[0]
            result.found = True
            result.word = entry.get("word", word)

            # Extract phonetics
            phonetics = entry.get("phonetics", [])
            for ph in phonetics:
                if ph.get("text"):
                    result.phonetic = ph["text"]
                if ph.get("audio") and not result.audio_url:
                    result.audio_url = ph["audio"]
                if result.phonetic and result.audio_url:
                    break

            # Extract definitions
            meanings = entry.get("meanings", [])
            for meaning in meanings:
                part_of_speech = meaning.get("partOfSpeech", "")
                for defn in meaning.get("definitions", []):
                    definition_entry = {
                        "part_of_speech": part_of_speech,
                        "definition": defn.get("definition", ""),
                        "example": defn.get("example", ""),
                        "synonyms": defn.get("synonyms", [])[:5],
                        "antonyms": defn.get("antonyms", [])[:5],
                    }
                    result.definitions.append(definition_entry)

            logger.info(f"[FreeDictionary] '{word}' ({language}): found, {len(result.definitions)} definitions")
            return result

        except httpx.TimeoutException:
            logger.warning(f"[FreeDictionary] '{word}' ({language}): timeout")
            return None
        except Exception as e:
            logger.error(f"[FreeDictionary] '{word}' ({language}): error {e}")
            return None


class WiktionaryProvider(DictionaryProvider):
    """
    Uses Wiktionary REST API for multilingual dictionary lookups.
    Free, no API key required.
    License: CC BY-SA 3.0
    """
    name = "wiktionary"
    BASE_URL = "https://en.wiktionary.org/api/rest_v1/page/definition"

    async def lookup(self, word: str, language: str = "en") -> Optional[DictionaryResult]:
        result = DictionaryResult()
        result.word = word
        result.language = language
        result.source = "Wiktionary"
        result.source_url = f"https://en.wiktionary.org/wiki/{word}"

        url = f"{self.BASE_URL}/{word}"

        try:
            async with httpx.AsyncClient(timeout=DICT_TIMEOUT) as client:
                response = await client.get(url, headers={"Accept": "application/json"})

            if response.status_code == 404:
                result.error = f"Word '{word}' not found on Wiktionary."
                return result

            if response.status_code != 200:
                logger.warning(f"[Wiktionary] '{word}': HTTP {response.status_code}")
                return None

            data = response.json()

            # Wiktionary returns definitions grouped by language
            # Map ISO codes to Wiktionary language names
            lang_name_map = {
                "en": "English", "es": "Spanish", "fr": "French", "de": "German",
                "it": "Italian", "pt": "Portuguese", "ru": "Russian", "ja": "Japanese",
                "ko": "Korean", "zh": "Chinese", "ar": "Arabic", "hi": "Hindi",
                "nl": "Dutch", "sv": "Swedish", "pl": "Polish", "tr": "Turkish",
                "fi": "Finnish", "da": "Danish", "no": "Norwegian", "cs": "Czech",
                "hu": "Hungarian", "ro": "Romanian", "el": "Greek", "he": "Hebrew",
                "th": "Thai", "vi": "Vietnamese", "id": "Indonesian", "ms": "Malay",
                "sw": "Swahili", "uk": "Ukrainian", "bg": "Bulgarian", "hr": "Croatian",
                "sr": "Serbian", "sk": "Slovak", "sl": "Slovenian", "lt": "Lithuanian",
                "lv": "Latvian", "bn": "Bengali", "ta": "Tamil", "te": "Telugu",
                "mr": "Marathi", "gu": "Gujarati", "kn": "Kannada", "ml": "Malayalam",
                "pa": "Punjabi", "ur": "Urdu", "fa": "Persian", "am": "Amharic",
                "ne": "Nepali", "si": "Sinhala", "af": "Afrikaans", "zu": "Zulu",
                "ha": "Hausa", "yo": "Yoruba", "ig": "Igbo",
            }

            target_lang_name = lang_name_map.get(language, "English")

            # Find the right language section
            lang_entries = data.get(target_lang_name, data.get("English", []))
            if not lang_entries:
                # Try any available language
                for lang_name, entries in data.items():
                    if entries:
                        lang_entries = entries
                        break

            if not lang_entries:
                result.error = f"No definitions found for '{word}'."
                return result

            result.found = True

            for entry in lang_entries:
                part_of_speech = entry.get("partOfSpeech", "")
                for defn in entry.get("definitions", []):
                    definition_text = defn.get("definition", "")
                    # Clean HTML tags from Wiktionary definitions
                    definition_text = re.sub(r'<[^>]+>', '', definition_text).strip()

                    if definition_text:
                        definition_entry = {
                            "part_of_speech": part_of_speech,
                            "definition": definition_text,
                            "example": "",
                            "synonyms": [],
                            "antonyms": [],
                        }
                        # Extract examples if present
                        examples = defn.get("examples", [])
                        if examples:
                            definition_entry["example"] = re.sub(r'<[^>]+>', '', examples[0]).strip()

                        result.definitions.append(definition_entry)

            logger.info(f"[Wiktionary] '{word}' ({language}): found, {len(result.definitions)} definitions")
            return result

        except httpx.TimeoutException:
            logger.warning(f"[Wiktionary] '{word}': timeout")
            return None
        except Exception as e:
            logger.error(f"[Wiktionary] '{word}': error {e}")
            return None


# Singleton instances
free_dictionary_provider = FreeDictionaryProvider()
wiktionary_provider = WiktionaryProvider()

# Ordered provider list for fallback chain
DICTIONARY_PROVIDERS = [free_dictionary_provider, wiktionary_provider]
