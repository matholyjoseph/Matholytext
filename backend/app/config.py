import os
import tempfile
from typing import Dict, Any

try:
    from pydantic_settings import BaseSettings
except ImportError:
    try:
        from pydantic import BaseSettings
    except ImportError:
        class BaseSettings:
            pass

# Serverless platforms (Vercel, AWS Lambda) mount the deployed code read-only;
# only the OS temp dir is writable, and it doesn't persist across invocations.
_db_dir = tempfile.gettempdir() if os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME") else "."
_default_db_path = os.path.join(_db_dir, "matholy_db.sqlite").replace("\\", "/")

class Settings(BaseSettings):
    APP_NAME: str = "Matholy Multilingual AI Assistant"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        f"sqlite+aiosqlite:///{_default_db_path}"
    )
    SYNC_DATABASE_URL: str = os.getenv(
        "SYNC_DATABASE_URL",
        f"sqlite:///{_default_db_path}"
    )
    
    # AI Engine Model Settings
    DEFAULT_MODEL_NAME: str = os.getenv("DEFAULT_MODEL_NAME", "Qwen/Qwen2.5-7B-Instruct")
    LORA_ADAPTER_PATH: str = os.getenv("LORA_ADAPTER_PATH", "./models/qlora_adapter")
    USE_QUANTIZATION: bool = os.getenv("USE_QUANTIZATION", "True").lower() == "true"
    DEVICE: str = os.getenv("DEVICE", "cuda" if os.getenv("CUDA_VISIBLE_DEVICES") else "cpu")

    # Speech Settings
    WHISPER_MODEL: str = os.getenv("WHISPER_MODEL", "base")
    TTS_TEMP_DIR: str = os.getenv("TTS_TEMP_DIR", "./temp_audio")

settings = Settings()

# Complete Metadata Registry for the 51 Supported Languages
SUPPORTED_LANGUAGES: Dict[str, Dict[str, Any]] = {
    "en": {"code3": "eng", "name": "English", "native": "English", "script": "Latin", "dir": "ltr", "flag": "🇬🇧"},
    "zh": {"code3": "zho", "name": "Mandarin Chinese", "native": "中文", "script": "Han", "dir": "ltr", "flag": "🇨🇳"},
    "hi": {"code3": "hin", "name": "Hindi", "native": "हिन्दी", "script": "Devanagari", "dir": "ltr", "flag": "🇮🇳"},
    "es": {"code3": "spa", "name": "Spanish", "native": "Español", "script": "Latin", "dir": "ltr", "flag": "🇪🇸"},
    "fr": {"code3": "fra", "name": "French", "native": "Français", "script": "Latin", "dir": "ltr", "flag": "🇫🇷"},
    "ar": {"code3": "ara", "name": "Arabic", "native": "العربية", "script": "Arabic", "dir": "rtl", "flag": "🇸🇦"},
    "bn": {"code3": "ben", "name": "Bengali", "native": "বাংলা", "script": "Bengali", "dir": "ltr", "flag": "🇧🇩"},
    "pt": {"code3": "por", "name": "Portuguese", "native": "Português", "script": "Latin", "dir": "ltr", "flag": "🇵🇹"},
    "ru": {"code3": "rus", "name": "Russian", "native": "Русский", "script": "Cyrillic", "dir": "ltr", "flag": "🇷🇺"},
    "ur": {"code3": "urd", "name": "Urdu", "native": "اردو", "script": "Arabic", "dir": "rtl", "flag": "🇵🇰"},
    "id": {"code3": "ind", "name": "Indonesian", "native": "Bahasa Indonesia", "script": "Latin", "dir": "ltr", "flag": "🇮🇩"},
    "de": {"code3": "deu", "name": "German", "native": "Deutsch", "script": "Latin", "dir": "ltr", "flag": "🇩🇪"},
    "ja": {"code3": "jpn", "name": "Japanese", "native": "日本語", "script": "Japanese", "dir": "ltr", "flag": "🇯🇵"},
    "sw": {"code3": "swa", "name": "Swahili", "native": "Kiswahili", "script": "Latin", "dir": "ltr", "flag": "🇰🇪"},
    "mr": {"code3": "mar", "name": "Marathi", "native": "मराठी", "script": "Devanagari", "dir": "ltr", "flag": "🇮🇳"},
    "te": {"code3": "tel", "name": "Telugu", "native": "తెలుగు", "script": "Telugu", "dir": "ltr", "flag": "🇮🇳"},
    "tr": {"code3": "tur", "name": "Turkish", "native": "Türkçe", "script": "Latin", "dir": "ltr", "flag": "🇹🇷"},
    "ta": {"code3": "tam", "name": "Tamil", "native": "தமிழ்", "script": "Tamil", "dir": "ltr", "flag": "🇮🇳"},
    "vi": {"code3": "vie", "name": "Vietnamese", "native": "Tiếng Việt", "script": "Latin", "dir": "ltr", "flag": "🇻🇳"},
    "ko": {"code3": "kor", "name": "Korean", "native": "한국어", "script": "Hangul", "dir": "ltr", "flag": "🇰🇷"},
    "it": {"code3": "ita", "name": "Italian", "native": "Italiano", "script": "Latin", "dir": "ltr", "flag": "🇮🇹"},
    "th": {"code3": "tha", "name": "Thai", "native": "ไทย", "script": "Thai", "dir": "ltr", "flag": "🇹🇭"},
    "gu": {"code3": "guj", "name": "Gujarati", "native": "ગુજરાતી", "script": "Gujarati", "dir": "ltr", "flag": "🇮🇳"},
    "fa": {"code3": "fas", "name": "Persian", "native": "فارسی", "script": "Arabic", "dir": "rtl", "flag": "🇮🇷"},
    "pl": {"code3": "pol", "name": "Polish", "native": "Polski", "script": "Latin", "dir": "ltr", "flag": "🇵🇱"},
    "nl": {"code3": "nld", "name": "Dutch", "native": "Nederlands", "script": "Latin", "dir": "ltr", "flag": "🇳🇱"},
    "uk": {"code3": "ukr", "name": "Ukrainian", "native": "Українська", "script": "Cyrillic", "dir": "ltr", "flag": "🇺🇦"},
    "ms": {"code3": "msa", "name": "Malay", "native": "Bahasa Melayu", "script": "Latin", "dir": "ltr", "flag": "🇲🇾"},
    "ro": {"code3": "ron", "name": "Romanian", "native": "Română", "script": "Latin", "dir": "ltr", "flag": "🇷🇴"},
    "el": {"code3": "ell", "name": "Greek", "native": "Ελληνικά", "script": "Greek", "dir": "ltr", "flag": "🇬🇷"},
    "he": {"code3": "heb", "name": "Hebrew", "native": "עבריت", "script": "Hebrew", "dir": "rtl", "flag": "🇮🇱"},
    "cs": {"code3": "ces", "name": "Czech", "native": "Čeština", "script": "Latin", "dir": "ltr", "flag": "🇨🇿"},
    "sv": {"code3": "swe", "name": "Swedish", "native": "Svenska", "script": "Latin", "dir": "ltr", "flag": "🇸🇪"},
    "hu": {"code3": "hun", "name": "Hungarian", "native": "Magyar", "script": "Latin", "dir": "ltr", "flag": "🇭🇺"},
    "fi": {"code3": "fin", "name": "Finnish", "native": "Suomi", "script": "Latin", "dir": "ltr", "flag": "🇫🇮"},
    "da": {"code3": "dan", "name": "Danish", "native": "Dansk", "script": "Latin", "dir": "ltr", "flag": "🇩🇰"},
    "no": {"code3": "nor", "name": "Norwegian", "native": "Norsk", "script": "Latin", "dir": "ltr", "flag": "🇳🇴"},
    "bg": {"code3": "bul", "name": "Bulgarian", "native": "Български", "script": "Cyrillic", "dir": "ltr", "flag": "🇧🇬"},
    "hr": {"code3": "hrv", "name": "Croatian", "native": "Hrvatski", "script": "Latin", "dir": "ltr", "flag": "🇭🇷"},
    "sr": {"code3": "srp", "name": "Serbian", "native": "Српски", "script": "Cyrillic", "dir": "ltr", "flag": "🇷🇸"},
    "sk": {"code3": "slk", "name": "Slovak", "native": "Slovenčina", "script": "Latin", "dir": "ltr", "flag": "🇸🇰"},
    "lt": {"code3": "lit", "name": "Lithuanian", "native": "Lietuvių", "script": "Latin", "dir": "ltr", "flag": "🇱🇹"},
    "sl": {"code3": "slv", "name": "Slovenian", "native": "Slovenščina", "script": "Latin", "dir": "ltr", "flag": "🇸🇮"},
    "zu": {"code3": "zul", "name": "Zulu", "native": "isiZulu", "script": "Latin", "dir": "ltr", "flag": "🇿🇦"},
    "ha": {"code3": "hau", "name": "Hausa", "native": "Hausa", "script": "Latin", "dir": "ltr", "flag": "🇳🇬"},
    "yo": {"code3": "yor", "name": "Yoruba", "native": "Yorùbá", "script": "Latin", "dir": "ltr", "flag": "🇳🇬"},
    "ig": {"code3": "ibo", "name": "Igbo", "native": "Asụsụ Igbo", "script": "Latin", "dir": "ltr", "flag": "🇳🇬"},
    "am": {"code3": "amh", "name": "Amharic", "native": "አማርኛ", "script": "Ethiopic", "dir": "ltr", "flag": "🇪🇹"},
    "ne": {"code3": "nep", "name": "Nepali", "native": "नेपाली", "script": "Devanagari", "dir": "ltr", "flag": "🇳🇵"},
    "pa": {"code3": "pan", "name": "Punjabi", "native": "ਪੰਜਾਬੀ", "script": "Gurmukhi", "dir": "ltr", "flag": "🇮🇳"},
    "si": {"code3": "sin", "name": "Sinhala", "native": "සිංහල", "script": "Sinhala", "dir": "ltr", "flag": "🇱🇰"},
}
