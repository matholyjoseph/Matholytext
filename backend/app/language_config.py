from typing import Optional, Dict, Any, List

LANGUAGES = {
    "en": {"name": "English", "iso639_1": "en", "iso639_3": "eng", "script": "Latn", "direction": "ltr", "locale": "en_US", "tts_code": "en-US", "argos_code": "en", "mymemory_code": "en", "libre_code": "en"},
    "zh": {"name": "Mandarin Chinese", "iso639_1": "zh", "iso639_3": "zho", "script": "Hans", "direction": "ltr", "locale": "zh_CN", "tts_code": "zh-CN", "argos_code": "zh", "mymemory_code": "zh-CN", "libre_code": "zh"},
    "hi": {"name": "Hindi", "iso639_1": "hi", "iso639_3": "hin", "script": "Deva", "direction": "ltr", "locale": "hi_IN", "tts_code": "hi-IN", "argos_code": "hi", "mymemory_code": "hi", "libre_code": "hi"},
    "es": {"name": "Spanish", "iso639_1": "es", "iso639_3": "spa", "script": "Latn", "direction": "ltr", "locale": "es_ES", "tts_code": "es-ES", "argos_code": "es", "mymemory_code": "es", "libre_code": "es"},
    "fr": {"name": "French", "iso639_1": "fr", "iso639_3": "fra", "script": "Latn", "direction": "ltr", "locale": "fr_FR", "tts_code": "fr-FR", "argos_code": "fr", "mymemory_code": "fr", "libre_code": "fr"},
    "ar": {"name": "Arabic", "iso639_1": "ar", "iso639_3": "ara", "script": "Arab", "direction": "rtl", "locale": "ar_SA", "tts_code": "ar-SA", "argos_code": "ar", "mymemory_code": "ar", "libre_code": "ar"},
    "bn": {"name": "Bengali", "iso639_1": "bn", "iso639_3": "ben", "script": "Beng", "direction": "ltr", "locale": "bn_IN", "tts_code": "bn-IN", "argos_code": None, "mymemory_code": "bn", "libre_code": "bn"},
    "pt": {"name": "Portuguese", "iso639_1": "pt", "iso639_3": "por", "script": "Latn", "direction": "ltr", "locale": "pt_PT", "tts_code": "pt-PT", "argos_code": "pt", "mymemory_code": "pt", "libre_code": "pt"},
    "ru": {"name": "Russian", "iso639_1": "ru", "iso639_3": "rus", "script": "Cyrl", "direction": "ltr", "locale": "ru_RU", "tts_code": "ru-RU", "argos_code": "ru", "mymemory_code": "ru", "libre_code": "ru"},
    "ur": {"name": "Urdu", "iso639_1": "ur", "iso639_3": "urd", "script": "Arab", "direction": "rtl", "locale": "ur_PK", "tts_code": "ur-PK", "argos_code": None, "mymemory_code": "ur", "libre_code": "ur"},
    "id": {"name": "Indonesian", "iso639_1": "id", "iso639_3": "ind", "script": "Latn", "direction": "ltr", "locale": "id_ID", "tts_code": "id-ID", "argos_code": "id", "mymemory_code": "id", "libre_code": "id"},
    "de": {"name": "German", "iso639_1": "de", "iso639_3": "deu", "script": "Latn", "direction": "ltr", "locale": "de_DE", "tts_code": "de-DE", "argos_code": "de", "mymemory_code": "de", "libre_code": "de"},
    "ja": {"name": "Japanese", "iso639_1": "ja", "iso639_3": "jpn", "script": "Jpan", "direction": "ltr", "locale": "ja_JP", "tts_code": "ja-JP", "argos_code": "ja", "mymemory_code": "ja", "libre_code": "ja"},
    "sw": {"name": "Swahili", "iso639_1": "sw", "iso639_3": "swa", "script": "Latn", "direction": "ltr", "locale": "sw_KE", "tts_code": "sw-KE", "argos_code": None, "mymemory_code": "sw", "libre_code": None},
    "mr": {"name": "Marathi", "iso639_1": "mr", "iso639_3": "mar", "script": "Deva", "direction": "ltr", "locale": "mr_IN", "tts_code": "mr-IN", "argos_code": None, "mymemory_code": "mr", "libre_code": None},
    "te": {"name": "Telugu", "iso639_1": "te", "iso639_3": "tel", "script": "Telu", "direction": "ltr", "locale": "te_IN", "tts_code": "te-IN", "argos_code": None, "mymemory_code": "te", "libre_code": "te"},
    "tr": {"name": "Turkish", "iso639_1": "tr", "iso639_3": "tur", "script": "Latn", "direction": "ltr", "locale": "tr_TR", "tts_code": "tr-TR", "argos_code": "tr", "mymemory_code": "tr", "libre_code": "tr"},
    "ta": {"name": "Tamil", "iso639_1": "ta", "iso639_3": "tam", "script": "Taml", "direction": "ltr", "locale": "ta_IN", "tts_code": "ta-IN", "argos_code": None, "mymemory_code": "ta", "libre_code": "ta"},
    "vi": {"name": "Vietnamese", "iso639_1": "vi", "iso639_3": "vie", "script": "Latn", "direction": "ltr", "locale": "vi_VN", "tts_code": "vi-VN", "argos_code": None, "mymemory_code": "vi", "libre_code": "vi"},
    "ko": {"name": "Korean", "iso639_1": "ko", "iso639_3": "kor", "script": "Kore", "direction": "ltr", "locale": "ko_KR", "tts_code": "ko-KR", "argos_code": "ko", "mymemory_code": "ko", "libre_code": "ko"},
    "it": {"name": "Italian", "iso639_1": "it", "iso639_3": "ita", "script": "Latn", "direction": "ltr", "locale": "it_IT", "tts_code": "it-IT", "argos_code": "it", "mymemory_code": "it", "libre_code": "it"},
    "th": {"name": "Thai", "iso639_1": "th", "iso639_3": "tha", "script": "Thai", "direction": "ltr", "locale": "th_TH", "tts_code": "th-TH", "argos_code": None, "mymemory_code": "th", "libre_code": "th"},
    "gu": {"name": "Gujarati", "iso639_1": "gu", "iso639_3": "guj", "script": "Gujr", "direction": "ltr", "locale": "gu_IN", "tts_code": "gu-IN", "argos_code": None, "mymemory_code": "gu", "libre_code": "gu"},
    "fa": {"name": "Persian", "iso639_1": "fa", "iso639_3": "fas", "script": "Arab", "direction": "rtl", "locale": "fa_IR", "tts_code": "fa-IR", "argos_code": "fa", "mymemory_code": "fa", "libre_code": "fa"},
    "pl": {"name": "Polish", "iso639_1": "pl", "iso639_3": "pol", "script": "Latn", "direction": "ltr", "locale": "pl_PL", "tts_code": "pl-PL", "argos_code": "pl", "mymemory_code": "pl", "libre_code": "pl"},
    "nl": {"name": "Dutch", "iso639_1": "nl", "iso639_3": "nld", "script": "Latn", "direction": "ltr", "locale": "nl_NL", "tts_code": "nl-NL", "argos_code": "nl", "mymemory_code": "nl", "libre_code": "nl"},
    "uk": {"name": "Ukrainian", "iso639_1": "uk", "iso639_3": "ukr", "script": "Cyrl", "direction": "ltr", "locale": "uk_UA", "tts_code": "uk-UA", "argos_code": "uk", "mymemory_code": "uk", "libre_code": "uk"},
    "ms": {"name": "Malay", "iso639_1": "ms", "iso639_3": "msa", "script": "Latn", "direction": "ltr", "locale": "ms_MY", "tts_code": "ms-MY", "argos_code": "ms", "mymemory_code": "ms", "libre_code": "ms"},
    "ro": {"name": "Romanian", "iso639_1": "ro", "iso639_3": "ron", "script": "Latn", "direction": "ltr", "locale": "ro_RO", "tts_code": "ro-RO", "argos_code": "ro", "mymemory_code": "ro", "libre_code": "ro"},
    "el": {"name": "Greek", "iso639_1": "el", "iso639_3": "ell", "script": "Grek", "direction": "ltr", "locale": "el_GR", "tts_code": "el-GR", "argos_code": "el", "mymemory_code": "el", "libre_code": "el"},
    "he": {"name": "Hebrew", "iso639_1": "he", "iso639_3": "heb", "script": "Hebr", "direction": "rtl", "locale": "he_IL", "tts_code": "he-IL", "argos_code": "he", "mymemory_code": "he", "libre_code": "he"},
    "cs": {"name": "Czech", "iso639_1": "cs", "iso639_3": "ces", "script": "Latn", "direction": "ltr", "locale": "cs_CZ", "tts_code": "cs-CZ", "argos_code": "cs", "mymemory_code": "cs", "libre_code": "cs"},
    "sv": {"name": "Swedish", "iso639_1": "sv", "iso639_3": "swe", "script": "Latn", "direction": "ltr", "locale": "sv_SE", "tts_code": "sv-SE", "argos_code": "sv", "mymemory_code": "sv", "libre_code": "sv"},
    "hu": {"name": "Hungarian", "iso639_1": "hu", "iso639_3": "hun", "script": "Latn", "direction": "ltr", "locale": "hu_HU", "tts_code": "hu-HU", "argos_code": "hu", "mymemory_code": "hu", "libre_code": "hu"},
    "fi": {"name": "Finnish", "iso639_1": "fi", "iso639_3": "fin", "script": "Latn", "direction": "ltr", "locale": "fi_FI", "tts_code": "fi-FI", "argos_code": "fi", "mymemory_code": "fi", "libre_code": "fi"},
    "da": {"name": "Danish", "iso639_1": "da", "iso639_3": "dan", "script": "Latn", "direction": "ltr", "locale": "da_DK", "tts_code": "da-DK", "argos_code": "da", "mymemory_code": "da", "libre_code": "da"},
    "no": {"name": "Norwegian", "iso639_1": "no", "iso639_3": "nor", "script": "Latn", "direction": "ltr", "locale": "no_NO", "tts_code": "nb-NO", "argos_code": "no", "mymemory_code": "no", "libre_code": "no"},
    "bg": {"name": "Bulgarian", "iso639_1": "bg", "iso639_3": "bul", "script": "Cyrl", "direction": "ltr", "locale": "bg_BG", "tts_code": "bg-BG", "argos_code": "bg", "mymemory_code": "bg", "libre_code": "bg"},
    "hr": {"name": "Croatian", "iso639_1": "hr", "iso639_3": "hrv", "script": "Latn", "direction": "ltr", "locale": "hr_HR", "tts_code": "hr-HR", "argos_code": "hr", "mymemory_code": "hr", "libre_code": "hr"},
    "sr": {"name": "Serbian", "iso639_1": "sr", "iso639_3": "srp", "script": "Cyrl", "direction": "ltr", "locale": "sr_RS", "tts_code": "sr-RS", "argos_code": "sr", "mymemory_code": "sr", "libre_code": "sr"},
    "sk": {"name": "Slovak", "iso639_1": "sk", "iso639_3": "slk", "script": "Latn", "direction": "ltr", "locale": "sk_SK", "tts_code": "sk-SK", "argos_code": "sk", "mymemory_code": "sk", "libre_code": "sk"},
    "lt": {"name": "Lithuanian", "iso639_1": "lt", "iso639_3": "lit", "script": "Latn", "direction": "ltr", "locale": "lt_LT", "tts_code": "lt-LT", "argos_code": "lt", "mymemory_code": "lt", "libre_code": "lt"},
    "sl": {"name": "Slovenian", "iso639_1": "sl", "iso639_3": "slv", "script": "Latn", "direction": "ltr", "locale": "sl_SI", "tts_code": "sl-SI", "argos_code": "sl", "mymemory_code": "sl", "libre_code": "sl"},
    "zu": {"name": "Zulu", "iso639_1": "zu", "iso639_3": "zul", "script": "Latn", "direction": "ltr", "locale": "zu_ZA", "tts_code": "zu-ZA", "argos_code": None, "mymemory_code": "zu", "libre_code": "zu"},
    "ha": {"name": "Hausa", "iso639_1": "ha", "iso639_3": "hau", "script": "Latn", "direction": "ltr", "locale": "ha_NG", "tts_code": "ha-NG", "argos_code": None, "mymemory_code": "ha", "libre_code": "ha"},
    "yo": {"name": "Yoruba", "iso639_1": "yo", "iso639_3": "yor", "script": "Latn", "direction": "ltr", "locale": "yo_NG", "tts_code": "yo-NG", "argos_code": None, "mymemory_code": "yo", "libre_code": "yo"},
    "ig": {"name": "Igbo", "iso639_1": "ig", "iso639_3": "ibo", "script": "Latn", "direction": "ltr", "locale": "ig_NG", "tts_code": "ig-NG", "argos_code": None, "mymemory_code": "ig", "libre_code": "ig"},
    "am": {"name": "Amharic", "iso639_1": "am", "iso639_3": "amh", "script": "Ethi", "direction": "ltr", "locale": "am_ET", "tts_code": "am-ET", "argos_code": None, "mymemory_code": "am", "libre_code": "am"},
    "ne": {"name": "Nepali", "iso639_1": "ne", "iso639_3": "nep", "script": "Deva", "direction": "ltr", "locale": "ne_NP", "tts_code": "ne-NP", "argos_code": None, "mymemory_code": "ne", "libre_code": "ne"},
    "pa": {"name": "Punjabi", "iso639_1": "pa", "iso639_3": "pan", "script": "Guru", "direction": "ltr", "locale": "pa_IN", "tts_code": "pa-IN", "argos_code": None, "mymemory_code": "pa", "libre_code": "pa"},
    "si": {"name": "Sinhala", "iso639_1": "si", "iso639_3": "sin", "script": "Sinh", "direction": "ltr", "locale": "si_LK", "tts_code": "si-LK", "argos_code": None, "mymemory_code": "si", "libre_code": "si"},
    "kn": {"name": "Kannada", "iso639_1": "kn", "iso639_3": "kan", "script": "Knda", "direction": "ltr", "locale": "kn_IN", "tts_code": "kn-IN", "argos_code": None, "mymemory_code": "kn", "libre_code": "kn"},
    "ml": {"name": "Malayalam", "iso639_1": "ml", "iso639_3": "mal", "script": "Mlym", "direction": "ltr", "locale": "ml_IN", "tts_code": "ml-IN", "argos_code": None, "mymemory_code": "ml", "libre_code": "ml"},
    "or": {"name": "Odia", "iso639_1": "or", "iso639_3": "ori", "script": "Orya", "direction": "ltr", "locale": "or_IN", "tts_code": "or-IN", "argos_code": None, "mymemory_code": "or", "libre_code": "or"},
    "lv": {"name": "Latvian", "iso639_1": "lv", "iso639_3": "lav", "script": "Latn", "direction": "ltr", "locale": "lv_LV", "tts_code": "lv-LV", "argos_code": "lv", "mymemory_code": "lv", "libre_code": "lv"},
    "af": {"name": "Afrikaans", "iso639_1": "af", "iso639_3": "afr", "script": "Latn", "direction": "ltr", "locale": "af_ZA", "tts_code": "af-ZA", "argos_code": None, "mymemory_code": "af", "libre_code": "af"},
}

def get_language(code: str) -> Optional[Dict[str, Any]]:
    return LANGUAGES.get(code)

def get_provider_code(lang_code: str, provider_name: str) -> Optional[str]:
    lang = get_language(lang_code)
    if not lang:
        return None
    key = f"{provider_name}_code"
    return lang.get(key)

def get_all_languages() -> Dict[str, Dict[str, Any]]:
    return LANGUAGES

def get_rtl_languages() -> List[str]:
    return [code for code, data in LANGUAGES.items() if data.get("direction") == "rtl"]

def is_supported(code: str) -> bool:
    return code in LANGUAGES
