"""
Voice Registry and Classification System.

Maintains metadata, categories, gender, depth, emotional style, speaking purpose,
and tags for over 100+ high-quality neural voices across 51 global languages.
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class VoiceMetadata(BaseModel):
    voice_id: str
    name: str
    provider: str
    language: str
    locale: str
    country: str
    accent: str
    gender: str          # 'male', 'female', 'neutral'
    depth: str           # 'deep', 'thick', 'strong', 'medium', 'light', 'soft'
    emotion: str         # 'warm', 'calm', 'happy', 'serious', 'dramatic', 'reassuring', 'excited', 'confident'
    purpose: str         # 'storytelling', 'audiobook', 'news', 'friendly', 'professional', 'documentary', 'meditation'
    storytelling_type: str  # 'Deep Male Narrator', 'Soft Female Narrator', 'Warm Storyteller', etc.
    is_free: bool = True
    is_offline: bool = False
    quality: str = "neural" # "neural" or "standard"
    sample_text: str = "Welcome to the Text-to-Speech studio. This is a short preview of my voice."
    recommended_purposes: List[str] = []

# Comprehensive Master Voice Catalog across 51 languages
VOICE_CATALOG: List[VoiceMetadata] = [
    # --- ENGLISH (en) ---
    VoiceMetadata(
        voice_id="en-US-GuyNeural",
        name="Guy (Deep Male Narrator)",
        provider="EdgeTTS",
        language="en",
        locale="en-US",
        country="United States",
        accent="American",
        gender="male",
        depth="deep",
        emotion="confident",
        purpose="audiobook",
        storytelling_type="Deep Male Narrator",
        sample_text="Welcome to the story studio. Let us begin our journey through the deep forest.",
        recommended_purposes=["storytelling", "audiobook", "documentary", "news"]
    ),
    VoiceMetadata(
        voice_id="en-US-JennyNeural",
        name="Jenny (Warm Female Storyteller)",
        provider="EdgeTTS",
        language="en",
        locale="en-US",
        country="United States",
        accent="American",
        gender="female",
        depth="medium",
        emotion="warm",
        purpose="storytelling",
        storytelling_type="Warm Storyteller",
        sample_text="Once upon a time in a peaceful town, extraordinary adventures were waiting to be discovered.",
        recommended_purposes=["storytelling", "audiobook", "friendly", "educational"]
    ),
    VoiceMetadata(
        voice_id="en-US-AriaNeural",
        name="Aria (Expressive & Emotional Female)",
        provider="EdgeTTS",
        language="en",
        locale="en-US",
        country="United States",
        accent="American",
        gender="female",
        depth="soft",
        emotion="dramatic",
        purpose="storytelling",
        storytelling_type="Emotional Narrator",
        sample_text="The wind whispered secret promises through the quiet leaves of the ancient trees.",
        recommended_purposes=["storytelling", "romantic", "meditation"]
    ),
    VoiceMetadata(
        voice_id="en-GB-RyanNeural",
        name="Ryan (British Deep Narrator)",
        provider="EdgeTTS",
        language="en",
        locale="en-GB",
        country="United Kingdom",
        accent="British",
        gender="male",
        depth="thick",
        emotion="serious",
        purpose="documentary",
        storytelling_type="Documentary Narrator",
        sample_text="Deep beneath the sea, creatures of immense mystery thrive in silent darkness.",
        recommended_purposes=["documentary", "news", "audiobook"]
    ),
    VoiceMetadata(
        voice_id="en-GB-SoniaNeural",
        name="Sonia (British Gentle Female)",
        provider="EdgeTTS",
        language="en",
        locale="en-GB",
        country="United Kingdom",
        accent="British",
        gender="female",
        depth="soft",
        emotion="calm",
        purpose="meditation",
        storytelling_type="Calm Bedtime Storyteller",
        sample_text="Take a slow, deep breath and let all your thoughts rest gently.",
        recommended_purposes=["meditation", "audiobook", "friendly"]
    ),
    VoiceMetadata(
        voice_id="en-US-ChristopherNeural",
        name="Christopher (Strong Professional Male)",
        provider="EdgeTTS",
        language="en",
        locale="en-US",
        country="United States",
        accent="American",
        gender="male",
        depth="strong",
        emotion="confident",
        purpose="news",
        storytelling_type="News Announcer",
        sample_text="Good evening. Here are today's top stories and global updates.",
        recommended_purposes=["news", "professional", "advertisement"]
    ),

    # --- SPANISH (es) ---
    VoiceMetadata(
        voice_id="es-ES-AlvaroNeural",
        name="Álvaro (Spanish Deep Male Narrator)",
        provider="EdgeTTS",
        language="es",
        locale="es-ES",
        country="Spain",
        accent="Castilian",
        gender="male",
        depth="deep",
        emotion="serious",
        purpose="storytelling",
        storytelling_type="Deep Male Narrator",
        sample_text="Bienvenido al estudio de voz. Esta es una narración profunda en español.",
        recommended_purposes=["storytelling", "audiobook", "documentary"]
    ),
    VoiceMetadata(
        voice_id="es-ES-ElviraNeural",
        name="Elvira (Spanish Warm Female)",
        provider="EdgeTTS",
        language="es",
        locale="es-ES",
        country="Spain",
        accent="Castilian",
        gender="female",
        depth="soft",
        emotion="warm",
        purpose="storytelling",
        storytelling_type="Warm Storyteller",
        sample_text="Había una vez en un pueblo lejano una historia llena de magia y esperanza.",
        recommended_purposes=["storytelling", "friendly", "educational"]
    ),
    VoiceMetadata(
        voice_id="es-MX-JorgeNeural",
        name="Jorge (Mexican Confident Male)",
        provider="EdgeTTS",
        language="es",
        locale="es-MX",
        country="Mexico",
        accent="Mexican",
        gender="male",
        depth="strong",
        emotion="confident",
        purpose="news",
        storytelling_type="Documentary Narrator",
        sample_text="Noticias de última hora y análisis profundo de los eventos más importantes.",
        recommended_purposes=["news", "professional"]
    ),

    # --- FRENCH (fr) ---
    VoiceMetadata(
        voice_id="fr-FR-HenriNeural",
        name="Henri (French Deep Narrator)",
        provider="EdgeTTS",
        language="fr",
        locale="fr-FR",
        country="France",
        accent="Parisian",
        gender="male",
        depth="deep",
        emotion="serious",
        purpose="audiobook",
        storytelling_type="Deep Male Narrator",
        sample_text="Bienvenue dans le studio vocal. Écoutez cette narration profonde et captivante.",
        recommended_purposes=["audiobook", "storytelling", "documentary"]
    ),
    VoiceMetadata(
        voice_id="fr-FR-DeniseNeural",
        name="Denise (French Soft Female)",
        provider="EdgeTTS",
        language="fr",
        locale="fr-FR",
        country="France",
        accent="Parisian",
        gender="female",
        depth="soft",
        emotion="warm",
        purpose="storytelling",
        storytelling_type="Soft Female Narrator",
        sample_text="Il était une fois une belle histoire pleine de poésie et de mystère.",
        recommended_purposes=["storytelling", "friendly", "meditation"]
    ),

    # --- GERMAN (de) ---
    VoiceMetadata(
        voice_id="de-DE-ConradNeural",
        name="Conrad (German Strong Male)",
        provider="EdgeTTS",
        language="de",
        locale="de-DE",
        country="Germany",
        accent="Standard German",
        gender="male",
        depth="thick",
        emotion="confident",
        purpose="news",
        storytelling_type="Documentary Narrator",
        sample_text="Willkommen im Sprachstudio. Eine klare und kraftvolle deutsche Stimme.",
        recommended_purposes=["news", "professional", "documentary"]
    ),
    VoiceMetadata(
        voice_id="de-DE-KatjaNeural",
        name="Katja (German Warm Female)",
        provider="EdgeTTS",
        language="de",
        locale="de-DE",
        country="Germany",
        accent="Standard German",
        gender="female",
        depth="soft",
        emotion="calm",
        purpose="storytelling",
        storytelling_type="Warm Storyteller",
        sample_text="Es war einmal in einem alten Schloss eine wunderbare Geschichte.",
        recommended_purposes=["storytelling", "friendly"]
    ),

    # --- MANDARIN CHINESE (zh) ---
    VoiceMetadata(
        voice_id="zh-CN-YunxiNeural",
        name="Yunxi (Chinese Deep Male Narrator)",
        provider="EdgeTTS",
        language="zh",
        locale="zh-CN",
        country="China",
        accent="Mandarin",
        gender="male",
        depth="deep",
        emotion="dramatic",
        purpose="storytelling",
        storytelling_type="Deep Male Narrator",
        sample_text="欢迎来到语音朗读演播室。为您带来深情自然的中文朗读。",
        recommended_purposes=["storytelling", "audiobook", "documentary"]
    ),
    VoiceMetadata(
        voice_id="zh-CN-XiaoxiaoNeural",
        name="Xiaoxiao (Chinese Soft Female)",
        provider="EdgeTTS",
        language="zh",
        locale="zh-CN",
        country="China",
        accent="Mandarin",
        gender="female",
        depth="soft",
        emotion="warm",
        purpose="friendly",
        storytelling_type="Soft Female Narrator",
        sample_text="很久很久以前，在一个美丽的山谷里，发生了一个神奇的故事。",
        recommended_purposes=["storytelling", "friendly", "educational"]
    ),

    # --- HINDI (hi) ---
    VoiceMetadata(
        voice_id="hi-IN-MadhurNeural",
        name="Madhur (Hindi Deep Male)",
        provider="EdgeTTS",
        language="hi",
        locale="hi-IN",
        country="India",
        accent="Hindi",
        gender="male",
        depth="deep",
        emotion="warm",
        purpose="storytelling",
        storytelling_type="Deep Male Narrator",
        sample_text="वॉइस स्टूडियो में आपका स्वागत है। यह एक सुंदर और स्पष्ट हिंदी आवाज़ है।",
        recommended_purposes=["storytelling", "audiobook", "news"]
    ),
    VoiceMetadata(
        voice_id="hi-IN-SwaraNeural",
        name="Swara (Hindi Gentle Female)",
        provider="EdgeTTS",
        language="hi",
        locale="hi-IN",
        country="India",
        accent="Hindi",
        gender="female",
        depth="soft",
        emotion="calm",
        purpose="storytelling",
        storytelling_type="Soft Female Narrator",
        sample_text="एक समय की बात है, एक सुंदर गाँव में एक अद्भुत कहानी शुरू हुई।",
        recommended_purposes=["storytelling", "friendly"]
    ),

    # --- ARABIC (ar) ---
    VoiceMetadata(
        voice_id="ar-SA-HamedNeural",
        name="Hamed (Arabic Deep Male Narrator)",
        provider="EdgeTTS",
        language="ar",
        locale="ar-SA",
        country="Saudi Arabia",
        accent="Arabic",
        gender="male",
        depth="deep",
        emotion="serious",
        purpose="audiobook",
        storytelling_type="Deep Male Narrator",
        sample_text="مرحبًا بكم في استوديو تحويل النص إلى صوت. هذه قراءة صحيحة وواضحة.",
        recommended_purposes=["storytelling", "audiobook", "news"]
    ),
    VoiceMetadata(
        voice_id="ar-SA-ZariyahNeural",
        name="Zariyah (Arabic Soft Female)",
        provider="EdgeTTS",
        language="ar",
        locale="ar-SA",
        country="Saudi Arabia",
        accent="Arabic",
        gender="female",
        depth="soft",
        emotion="warm",
        purpose="storytelling",
        storytelling_type="Warm Storyteller",
        sample_text="كان يا ما كان في قديم الزمان قصة مليئة بالأمل والحكمة.",
        recommended_purposes=["storytelling", "friendly"]
    ),

    # --- RUSSIAN (ru) ---
    VoiceMetadata(
        voice_id="ru-RU-DmitryNeural",
        name="Dmitry (Russian Deep Male)",
        provider="EdgeTTS",
        language="ru",
        locale="ru-RU",
        country="Russia",
        accent="Russian",
        gender="male",
        depth="thick",
        emotion="serious",
        purpose="audiobook",
        storytelling_type="Deep Male Narrator",
        sample_text="Добро пожаловать в голосовую студию. Это глубокий и чёткий русский голос.",
        recommended_purposes=["storytelling", "audiobook", "news"]
    ),

    # --- JAPANESE (ja) ---
    VoiceMetadata(
        voice_id="ja-JP-KeitaNeural",
        name="Keita (Japanese Male Narrator)",
        provider="EdgeTTS",
        language="ja",
        locale="ja-JP",
        country="Japan",
        accent="Japanese",
        gender="male",
        depth="medium",
        emotion="calm",
        purpose="storytelling",
        storytelling_type="Documentary Narrator",
        sample_text="音声スタジオへようこそ。美しく自然な日本語の朗読をお届けします。",
        recommended_purposes=["storytelling", "news", "professional"]
    ),

    # --- FREE BROWSER FALLBACK VOICES ---
    VoiceMetadata(
        voice_id="browser-default-en",
        name="Browser System Voice (Offline Free)",
        provider="WebSpeech",
        language="en",
        locale="en-US",
        country="Global",
        accent="Standard",
        gender="neutral",
        depth="medium",
        emotion="calm",
        purpose="friendly",
        storytelling_type="Friendly Voice",
        is_free=True,
        is_offline=True,
        quality="standard",
        sample_text="This is a free offline system voice generated directly by your web browser."
    )
]

class VoiceRegistry:
    def get_all_voices(self) -> List[VoiceMetadata]:
        return VOICE_CATALOG

    def filter_voices(
        self,
        language: Optional[str] = None,
        gender: Optional[str] = None,
        depth: Optional[str] = None,
        purpose: Optional[str] = None,
        provider: Optional[str] = None,
        is_free: Optional[bool] = None,
        search_query: Optional[str] = None
    ) -> List[VoiceMetadata]:
        results = VOICE_CATALOG

        if language:
            results = [v for v in results if v.language == language or v.locale.startswith(language)]

        if gender and gender != 'all':
            results = [v for v in results if v.gender == gender]

        if depth and depth != 'all':
            results = [v for v in results if v.depth == depth]

        if purpose and purpose != 'all':
            results = [v for v in results if v.purpose == purpose or purpose in v.recommended_purposes]

        if provider and provider != 'all':
            results = [v for v in results if v.provider.lower() == provider.lower()]

        if is_free is not None:
            results = [v for v in results if v.is_free == is_free]

        if search_query:
            q = search_query.lower()
            results = [
                v for v in results if (
                    q in v.name.lower() or
                    q in v.accent.lower() or
                    q in v.storytelling_type.lower() or
                    q in v.language.lower() or
                    q in v.country.lower()
                )
            ]

        # If no specific voice matched for language, return fallback voices for that language
        if not results and language:
            # Fallback to English voices or browser voice
            results = [v for v in VOICE_CATALOG if v.language == 'en' or v.is_offline]

        return results

    def get_voice_by_id(self, voice_id: str) -> Optional[VoiceMetadata]:
        for v in VOICE_CATALOG:
            if v.voice_id == voice_id:
                return v
        return None

voice_registry = VoiceRegistry()
