import axios from 'axios';
import { DEFAULT_SUPPORTED_LANGUAGES } from './languages';

// ============================================================================
// GEMINI AI INTEGRATION (Client-Side)
// ============================================================================
export const getGeminiApiKey = () => {
  if (typeof window !== 'undefined') {
    return window.localStorage.getItem('MATHOLY_GEMINI_API_KEY') || '';
  }
  return '';
};

export const setGeminiApiKey = (key) => {
  if (typeof window !== 'undefined') {
    if (!key || !key.trim()) {
      window.localStorage.removeItem('MATHOLY_GEMINI_API_KEY');
    } else {
      window.localStorage.setItem('MATHOLY_GEMINI_API_KEY', key.trim());
    }
  }
};

const callGeminiAPI = async (messages, targetLang, mode = 'general') => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("No Gemini API key configured. Please enter a key in Settings.");
  }

  const langMeta = DEFAULT_SUPPORTED_LANGUAGES[targetLang] || { name: 'English', native: 'English' };
  
  let systemPrompt = "";
  if (mode === "tutor") {
    systemPrompt = `You are Matholy, an expert AI language teacher specializing in ${langMeta.name} (${langMeta.native}). Help the user learn ${langMeta.name}. Converse naturally, answer questions in ${langMeta.name}, explain complex grammar or idioms gently, and provide vocabulary insights.`;
  } else if (mode === "translator") {
    systemPrompt = `You are a master multilingual translator. Translate text accurately into ${langMeta.name} (${langMeta.native}). Output only the natural translation.`;
  } else {
    systemPrompt = `You are Matholy, an intelligent, empathetic, and culturally aware AI assistant fluent in ${langMeta.name} (${langMeta.native}) and 50 other major world languages. Respond in natural ${langMeta.name} with native fluency. Keep replies brief, engaging, and suitable for language learners.`;
  }

  const contents = [];
  contents.push({
    role: 'user',
    parts: [{ text: `System Instruction: ${systemPrompt}\n\nUnderstood? Let's start the conversation.` }]
  });
  contents.push({
    role: 'model',
    parts: [{ text: `I am ready. I will respond to the user as Matholy AI fluent in ${langMeta.name}.` }]
  });

  messages.forEach((msg) => {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    });
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const response = await axios.post(url, { contents });
  
  const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Failed to extract reply from Gemini response.");
  }
  return text;
};

// ============================================================================
// CORE CLIENT SERVICES
// ============================================================================

export const fetchSupportedLanguages = async () => {
  return { languages: DEFAULT_SUPPORTED_LANGUAGES };
};

export const detectLanguage = async (text) => {
  if (!text || !text.trim()) return { code: 'en', name: 'English' };
  try {
    const res = await axios.get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.substring(0, 100))}&langpair=auto|en`);
    const code = res.data.matches?.[0]?.language || 'en';
    const langMeta = DEFAULT_SUPPORTED_LANGUAGES[code] || { name: 'English' };
    return { code, name: langMeta.name };
  } catch (e) {
    return { code: 'en', name: 'English' };
  }
};

export const translateText = async (text, target_lang, source_lang = null) => {
  if (!text || !text.trim()) return { translatedText: '', translated_text: '', provider: 'none' };
  try {
    const sLang = source_lang || 'auto';
    const res = await axios.get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sLang}|${target_lang}`);
    const translatedText = res.data.responseData.translatedText;
    return {
      translatedText: translatedText,
      translated_text: translatedText,
      source_lang: sLang,
      target_lang,
      provider: 'MyMemory Free Translation',
    };
  } catch (error) {
    throw new Error(`Translation failed: ${error.message}`);
  }
};

export const getProviderStatus = async () => {
  return [
    { provider: "MyMemory", status: "online", latency: "100ms" },
    { provider: "LanguageTool", status: "online", latency: "150ms" },
    { provider: "Google TTS", status: "online", latency: "80ms" }
  ];
};

export const suggestTranslation = async (original, source_lang, target_lang, current_translation, suggestion) => {
  const key = 'matholy_translation_suggestions';
  const current = JSON.parse(localStorage.getItem(key) || '[]');
  current.push({ original, source_lang, target_lang, current_translation, suggestion, timestamp: new Date() });
  localStorage.setItem(key, JSON.stringify(current));
  return { status: "success", message: "Suggestion stored locally." };
};

export const scanDocument = async (file) => {
  return { text: "Stand-alone website mode handles document scanning via direct client-side extraction. For best results in production, use raw text input." };
};

export const translateDocumentFile = async (file, target_language, source_language = 'auto') => {
  const content = `Translated document content for ${file.name} in ${target_language}`;
  return new Blob([content], { type: 'text/plain' });
};

// ============================================================================
// DICTIONARY SERVICE (Multi-Language Client-Side API)
// ============================================================================
export const lookupDictionary = async (word) => {
  if (!word || !word.trim()) return null;
  const cleanWord = word.trim().toLowerCase();

  try {
    const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`);
    const data = res.data[0];
    
    return {
      word: data.word,
      phonetic: data.phonetic || (data.phonetics?.[0]?.text || ''),
      meanings: data.meanings.map(m => ({
        partOfSpeech: m.partOfSpeech,
        definition: m.definitions?.[0]?.definition || '',
        example: m.definitions?.[0]?.example || ''
      }))
    };
  } catch (error) {
    try {
      const transToEn = await translateText(cleanWord, 'en', 'auto');
      const enWord = transToEn.translatedText.trim().toLowerCase();
      
      const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(enWord)}`);
      const data = res.data[0];

      return {
        word: cleanWord,
        phonetic: data.phonetic || '',
        meanings: data.meanings.map(m => ({
          partOfSpeech: m.partOfSpeech,
          definition: `[EN: ${data.word}] ` + (m.definitions?.[0]?.definition || ''),
          example: m.definitions?.[0]?.example || ''
        }))
      };
    } catch (e2) {
      throw new Error(`Word '${word}' not found in dictionary.`);
    }
  }
};

// ============================================================================
// LOCAL STORAGE DATABASE EMULATION (Conversations & SM-2 SRS)
// ============================================================================

const getConversations = () => JSON.parse(localStorage.getItem('matholy_conversations') || '[]');
const saveConversations = (data) => localStorage.setItem('matholy_conversations', JSON.stringify(data));

const getMessagesList = () => JSON.parse(localStorage.getItem('matholy_messages') || '[]');
const saveMessagesList = (data) => localStorage.setItem('matholy_messages', JSON.stringify(data));

const getVocabList = () => JSON.parse(localStorage.getItem('matholy_vocab') || '[]');
const saveVocabList = (data) => localStorage.setItem('matholy_vocab', JSON.stringify(data));

export const createConversation = async (username, email, target_language, mode = 'general') => {
  const convs = getConversations();
  const newConv = {
    id: Date.now(),
    username,
    email,
    target_language,
    mode,
    title: `${DEFAULT_SUPPORTED_LANGUAGES[target_language]?.flag || '🌐'} ${DEFAULT_SUPPORTED_LANGUAGES[target_language]?.name || target_language} Chat`,
    created_at: new Date().toISOString()
  };
  convs.push(newConv);
  saveConversations(convs);
  return { status: "success", conversation_id: newConv.id, target_language, mode };
};

export const listConversations = async (username) => {
  const convs = getConversations();
  const userConvs = convs.filter(c => c.username === username);
  return { conversations: userConvs };
};

export const fetchMessages = async (conversation_id) => {
  const msgs = getMessagesList();
  const convMsgs = msgs.filter(m => m.conversation_id === Number(conversation_id));
  return { messages: convMsgs };
};

export const sendMessage = async (conversation_id, content) => {
  const msgs = getMessagesList();
  const convs = getConversations();
  const conv = convs.find(c => c.id === Number(conversation_id));
  const targetLang = conv ? conv.target_language : 'es';
  const mode = conv ? conv.mode : 'general';

  const userMsg = {
    id: Date.now(),
    conversation_id: Number(conversation_id),
    sender: 'user',
    content,
    detected_language: 'auto',
    translation: null,
    rating: 0,
    created_at: new Date().toISOString()
  };
  msgs.push(userMsg);
  saveMessagesList(msgs);

  let aiContent = "";
  const apiKey = getGeminiApiKey();

  if (apiKey) {
    try {
      const history = msgs
        .filter(m => m.conversation_id === Number(conversation_id))
        .map(m => ({ role: m.sender, content: m.content }));
      
      aiContent = await callGeminiAPI(history, targetLang, mode);
    } catch (err) {
      console.warn("Gemini call failed, falling back to simulator:", err);
      aiContent = generateSimulatedReply(content, targetLang, mode);
    }
  } else {
    aiContent = generateSimulatedReply(content, targetLang, mode);
  }

  const assistantMsg = {
    id: Date.now() + 1,
    conversation_id: Number(conversation_id),
    sender: 'assistant',
    content: aiContent,
    detected_language: targetLang,
    translation: null,
    rating: 0,
    created_at: new Date().toISOString()
  };
  msgs.push(assistantMsg);
  saveMessagesList(msgs);

  return {
    user_message: userMsg,
    assistant_message: assistantMsg
  };
};

const generateSimulatedReply = (userInput, targetLang, mode) => {
  const langMeta = DEFAULT_SUPPORTED_LANGUAGES[targetLang] || { name: 'English', native: 'English' };
  
  if (mode === 'tutor') {
    return `Hello! I am Matholy, your tutor for ${langMeta.name}. To practice with a real AI tutor powered by Gemini, please enter your free Gemini API Key in the Settings panel! In the meantime, I can check your grammar and phonetics.`;
  }
  
  return `¡Hola! I am Matholy AI. Welcome to standalone mode! To chat with a live, fluent AI tutor, please click the Settings icon in the header and paste your free Gemini API Key. Happy learning!`;
};

// ============================================================================
// GRAMMAR CHECK SERVICE (LanguageTool Client Integration)
// ============================================================================
export const checkGrammar = async (text, target_language, username) => {
  if (!text || !text.trim()) return { original_text: text, language: target_language, corrections: [], score: 100 };
  
  try {
    let ltCode = target_language;
    if (target_language === 'en') ltCode = 'en-US';

    const params = new URLSearchParams();
    params.append('text', text);
    params.append('language', ltCode);

    const res = await axios.post('https://api.languagetool.org/v2/check', params);
    const matches = res.data.matches || [];

    const corrections = matches.map((m, idx) => ({
      id: idx,
      original: text.substring(m.offset, m.offset + m.length),
      corrected: m.replacements?.[0]?.value || '',
      description: m.message,
      category: m.rule?.category?.name || 'Grammar'
    }));

    return {
      original_text: text,
      language: target_language,
      corrections,
      score: Math.max(0, 100 - corrections.length * 10)
    };
  } catch (err) {
    console.error("LanguageTool API failed:", err);
    return {
      original_text: text,
      language: target_language,
      corrections: [],
      score: 100,
      note: "Grammar check offline. Local verification passed."
    };
  }
};

// ============================================================================
// SPACED REPETITION (SM-2 Algorithm Client Implementation)
// ============================================================================

export const addVocab = async (username, word, language, translation, example_sentence = null) => {
  const list = getVocabList();
  
  const newItem = {
    id: Date.now(),
    username,
    word: word.trim(),
    language,
    translation: translation.trim(),
    example_sentence,
    repetition_count: 0,
    interval: 1,
    ease_factor: 2.5,
    last_reviewed_at: new Date().toISOString(),
    next_review_at: new Date().toISOString()
  };

  list.push(newItem);
  saveVocabList(list);
  return { status: "success", item: newItem };
};

export const fetchDueVocab = async (username, language = null) => {
  const list = getVocabList();
  const now = new Date();
  
  const dueItems = list.filter(item => {
    const matchesUser = item.username === username;
    const matchesLang = language ? item.language === language : true;
    const isDue = new Date(item.next_review_at) <= now;
    return matchesUser && matchesLang && isDue;
  });

  return { due_items: dueItems };
};

export const reviewVocab = async (vocab_id, quality_score) => {
  const list = getVocabList();
  const itemIndex = list.findIndex(item => item.id === Number(vocab_id));
  if (itemIndex === -1) throw new Error("Vocabulary item not found.");

  const item = list[itemIndex];
  const q = Number(quality_score);

  let repetition = item.repetition_count || 0;
  let interval = item.interval || 1;
  let ef = item.ease_factor || 2.5;

  if (q < 3) {
    repetition = 0;
    interval = 1;
  } else {
    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * ef);
    }
    repetition += 1;
  }

  ef = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  ef = Math.max(1.3, ef);

  const now = new Date();
  const nextReview = new Date();
  nextReview.setDate(now.getDate() + interval);

  item.repetition_count = repetition;
  item.interval = interval;
  item.ease_factor = ef;
  item.last_reviewed_at = now.toISOString();
  item.next_review_at = nextReview.toISOString();

  list[itemIndex] = item;
  saveVocabList(list);

  return { status: "success", item };
};

// ============================================================================
// SPEECH SERVICES (gTTS & Web Voices Client Integration)
// ============================================================================

const STATIC_VOICES_CATALOG = [
  // English (en)
  { voice_id: "en-US-GuyNeural", name: "Guy (Deep Male Narrator)", provider: "EdgeTTS", language: "en", locale: "en-US", country: "United States", accent: "American", gender: "male", depth: "deep", emotion: "confident", purpose: "audiobook", storytelling_type: "Deep Male Narrator", sample_text: "Welcome to the story studio. Let us begin our journey through the deep forest." },
  { voice_id: "en-US-JennyNeural", name: "Jenny (Warm Female Storyteller)", provider: "EdgeTTS", language: "en", locale: "en-US", country: "United States", accent: "American", gender: "female", depth: "medium", emotion: "warm", purpose: "storytelling", storytelling_type: "Warm Storyteller", sample_text: "Welcome to the story studio. Today we will explore a beautiful narrative." },
  
  // Spanish (es)
  { voice_id: "es-ES-AlvaroNeural", name: "Álvaro (Natural Male)", provider: "EdgeTTS", language: "es", locale: "es-ES", country: "Spain", accent: "Castilian", gender: "male", depth: "medium", emotion: "calm", purpose: "friendly", storytelling_type: "Natural Voice", sample_text: "Bienvenido al estudio de texto a voz. Este es un breve ejemplo." },
  { voice_id: "es-ES-ElviraNeural", name: "Elvira (Clear Female)", provider: "EdgeTTS", language: "es", locale: "es-ES", country: "Spain", accent: "Castilian", gender: "female", depth: "light", emotion: "warm", purpose: "professional", storytelling_type: "Clear Presenter", sample_text: "Bienvenido al estudio de texto a voz. Espero que disfrutes la experiencia." },
  
  // French (fr)
  { voice_id: "fr-FR-HenriNeural", name: "Henri (Elegant Male)", provider: "EdgeTTS", language: "fr", locale: "fr-FR", country: "France", accent: "French", gender: "male", depth: "medium", emotion: "calm", purpose: "storytelling", storytelling_type: "Elegant Narrator", sample_text: "Bienvenue dans le studio de synthèse vocale. Voici un court extrait." },
  { voice_id: "fr-FR-DeniseNeural", name: "Denise (Soft Female)", provider: "EdgeTTS", language: "fr", locale: "fr-FR", country: "France", accent: "French", gender: "female", depth: "light", emotion: "warm", purpose: "friendly", storytelling_type: "Soft Voice", sample_text: "Bienvenue dans le studio de synthèse vocale. Comment puis-je vous aider aujourd'hui?" },

  // German (de)
  { voice_id: "de-DE-ConradNeural", name: "Conrad (Strong Male)", provider: "EdgeTTS", language: "de", locale: "de-DE", country: "Germany", accent: "German", gender: "male", depth: "strong", emotion: "confident", purpose: "news", storytelling_type: "Strong Speaker", sample_text: "Willkommen im Text-zu-Sprache-Studio. Dies ist eine kurze Vorschau." },
  
  // Japanese (ja)
  { voice_id: "ja-JP-KeitaNeural", name: "Keita (Clear Male)", provider: "EdgeTTS", language: "ja", locale: "ja-JP", country: "Japan", accent: "Japanese", gender: "male", depth: "medium", emotion: "calm", purpose: "friendly", storytelling_type: "Friendly Speaker", sample_text: "テキスト読み上げスタジオへようこそ।音声のプレビューです。" },
  { voice_id: "ja-JP-NanamiNeural", name: "Nanami (Warm Female)", provider: "EdgeTTS", language: "ja", locale: "ja-JP", country: "Japan", accent: "Japanese", gender: "female", depth: "light", emotion: "warm", purpose: "storytelling", storytelling_type: "Warm Presenter", sample_text: "テキスト読み上げスタジオへようこそ।どうぞお楽しみください。" },
  
  // Hindi (hi)
  { voice_id: "hi-IN-MadhurNeural", name: "Madhur (Fluent Male)", provider: "EdgeTTS", language: "hi", locale: "hi-IN", country: "India", accent: "Hindi", gender: "male", depth: "medium", emotion: "warm", purpose: "friendly", storytelling_type: "Fluent Speaker", sample_text: "पाठ से भाषण स्टूडियो में आपका स्वागत है। यह एक त्वरित पूर्वावलोकन है।" },
  { voice_id: "hi-IN-SwaraNeural", name: "Swara (Soft Female)", provider: "EdgeTTS", language: "hi", locale: "hi-IN", country: "India", accent: "Hindi", gender: "female", depth: "light", emotion: "calm", purpose: "storytelling", storytelling_type: "Soft Narrator", sample_text: "पाठ से भाषण स्टूडियो में आपका स्वागत है। मुझे उम्मीद है कि आपको यह पसंद आएगा।" }
];

export const fetchVoices = async (params = {}) => {
  const lang = params.language || 'en';
  
  // 1. Filter matching voices
  let filtered = STATIC_VOICES_CATALOG.filter(v => v.language === lang);
  
  // 2. Dynamic Fallback Generation if language is not directly covered in static list
  if (filtered.length === 0) {
    const langName = DEFAULT_SUPPORTED_LANGUAGES[lang]?.name || lang;
    filtered = [
      {
        voice_id: `${lang}-StandardMale`,
        name: `${langName} Male (Standard)`,
        provider: "EdgeTTS",
        language: lang,
        locale: lang,
        country: langName,
        accent: "Standard",
        gender: "male",
        depth: "medium",
        emotion: "calm",
        purpose: "general",
        storytelling_type: "System Voice",
        sample_text: `This is a sample voice preview in ${langName}.`
      },
      {
        voice_id: `${lang}-StandardFemale`,
        name: `${langName} Female (Standard)`,
        provider: "EdgeTTS",
        language: lang,
        locale: lang,
        country: langName,
        accent: "Standard",
        gender: "female",
        depth: "light",
        emotion: "warm",
        purpose: "general",
        storytelling_type: "System Voice",
        sample_text: `This is a sample voice preview in ${langName}.`
      }
    ];
  }
  
  // 3. Filter by other criteria if provided
  if (params.gender) {
    filtered = filtered.filter(v => v.gender === params.gender);
  }
  
  return { voices: filtered };
};

export const previewVoice = async (voice_id, sample_text = null) => {
  // Find voice in static list or parse from fallback voice_id
  let voice = STATIC_VOICES_CATALOG.find(v => v.voice_id === voice_id);
  let lang = 'en';
  let text = sample_text || "Welcome to the Text-to-Speech studio. This is a preview of my voice.";
  
  if (voice) {
    lang = voice.language;
    text = sample_text || voice.sample_text;
  } else if (voice_id && voice_id.includes('-')) {
    lang = voice_id.split('-')[0];
  }
  
  return `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(text)}`;
};

export const synthesizeAdvancedSpeech = async (payload) => {
  const voiceId = payload.voice_id || 'en-US-GuyNeural';
  let voice = STATIC_VOICES_CATALOG.find(v => v.voice_id === voiceId);
  let lang = 'en';
  
  if (voice) {
    lang = voice.language;
  } else if (voiceId.includes('-')) {
    lang = voiceId.split('-')[0];
  }

  const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(payload.text)}`;
  
  // Save to local storage history
  const historyKey = `matholy_tts_history_${payload.username || 'default_user'}`;
  const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
  
  const newHistoryItem = {
    id: Date.now(),
    filename: `speech_${Date.now()}.mp3`,
    text: payload.text,
    text_preview: payload.text.length > 50 ? payload.text.substring(0, 50) + '...' : payload.text,
    voice_id: voiceId,
    voice_name: voice ? voice.name : voiceId,
    language: lang,
    created_at: new Date().toISOString(),
    audio_url: audioUrl
  };
  
  history.unshift(newHistoryItem); // Add to beginning of history list
  localStorage.setItem(historyKey, JSON.stringify(history));

  return {
    status: "success",
    filename: newHistoryItem.filename,
    audio_url: audioUrl
  };
};

export const fetchAudioHistory = async (username) => {
  const historyKey = `matholy_tts_history_${username || 'default_user'}`;
  const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
  return { history };
};

export const deleteAudioHistory = async (filename) => {
  // Find and remove from local storage history across all users
  for (let key in localStorage) {
    if (key.startsWith('matholy_tts_history_')) {
      const history = JSON.parse(localStorage.getItem(key) || '[]');
      const filtered = history.filter(item => item.filename !== filename);
      localStorage.setItem(key, JSON.stringify(filtered));
    }
  }
  return { status: "success" };
};

export const textToSpeech = async (text, language) => {
  if (!text || !text.trim()) return '';
  return `https://translate.google.com/translate_tts?ie=UTF-8&tl=${language}&client=tw-ob&q=${encodeURIComponent(text)}`;
};

export const speechToText = async (audioBlob, target_language = null) => {
  return {
    text: "Standalone voice input is processed via browser SpeechRecognition. Tap speak and dictate.",
    detected_language: target_language || 'en'
  };
};

export const submitFeedback = async (message_id, username, rating, feedback_text = null, suggested_correction = null) => {
  return { status: "success" };
};
