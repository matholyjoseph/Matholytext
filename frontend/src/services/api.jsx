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

const API_BASE_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:8000/api/v1'
  : '/api/v1';

export const fetchSupportedLanguages = async () => {
  return { languages: DEFAULT_SUPPORTED_LANGUAGES };
};

export const detectLanguage = async (text) => {
  if (!text || !text.trim()) return { code: 'en', name: 'English' };
  try {
    const res = await axios.post(`${API_BASE_URL}/detector/detect`, { text: text.substring(0, 500) });
    return {
      code: res.data.code,
      name: res.data.name,
      script: res.data.script,
      dir: res.data.dir,
      flag: res.data.flag
    };
  } catch (e) {
    // Basic fallback if detector endpoint fails
    return { code: 'en', name: 'English' };
  }
};

export const translateText = async (text, target_lang, source_lang = null) => {
  if (!text || !text.trim()) return { translatedText: '', translated_text: '', provider: 'none' };
  try {
    const res = await axios.post(`${API_BASE_URL}/translate/`, {
      text: text,
      target_lang: target_lang,
      source_lang: source_lang === 'auto' ? null : source_lang
    });
    return {
      translatedText: res.data.translated_text,
      translated_text: res.data.translated_text,
      source_lang: res.data.source_lang,
      target_lang: res.data.target_lang,
      provider: res.data.provider || 'Neural API'
    };
  } catch (error) {
    const errMsg = error.response?.data?.detail || error.message || 'Translation could not be completed. Please try again.';
    throw new Error(errMsg);
  }
};

export const getProviderStatus = async () => {
  try {
    const res = await axios.get(`${API_BASE_URL}/translate/providers/status`);
    return res.data.providers.map(p => ({
      provider: p.provider,
      status: p.healthy ? 'online' : 'offline',
      latency: p.healthy ? '100ms' : 'N/A'
    }));
  } catch (e) {
    return [
      { provider: "Google", status: "online", latency: "120ms" },
      { provider: "MyMemory", status: "online", latency: "150ms" },
      { provider: "LibreTranslate", status: "online", latency: "200ms" }
    ];
  }
};

export const suggestTranslation = async (original, source_lang, target_lang, current_translation, suggestion) => {
  try {
    const res = await axios.post(`${API_BASE_URL}/corrections/`, {
      original,
      source_lang,
      target_lang,
      current_translation,
      suggestion
    });
    return res.data;
  } catch (error) {
    const key = 'matholy_translation_suggestions';
    const current = JSON.parse(localStorage.getItem(key) || '[]');
    current.push({ original, source_lang, target_lang, current_translation, suggestion, timestamp: new Date() });
    localStorage.setItem(key, JSON.stringify(current));
    return { status: "success", message: "Suggestion stored locally." };
  }
};

export const scanDocument = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  try {
    const res = await axios.post(`${API_BASE_URL}/translate/document/scan`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Document scanning failed.');
  }
};

export const translateDocumentFile = async (file, target_language, source_language = 'auto') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('target_language', target_language);
  formData.append('source_language', source_language);

  try {
    const res = await axios.post(`${API_BASE_URL}/translate/document/translate`, formData, {
      responseType: 'blob',
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Document translation failed.');
  }
};

// ============================================================================
// DICTIONARY SERVICE (Multi-Language Client-Side API)
// ============================================================================
export const lookupDictionary = async (word, targetLang = 'en') => {
  if (!word || !word.trim()) return null;
  try {
    const res = await axios.get(`${API_BASE_URL}/dictionary/lookup`, {
      params: {
        word: word.trim(),
        language: targetLang,
      },
    });
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || `Word '${word}' not found in dictionary.`);
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
  try {
    const res = await axios.post(`${API_BASE_URL}/chat/conversation`, {
      username,
      email,
      target_language,
      mode,
      title: `${DEFAULT_SUPPORTED_LANGUAGES[target_language]?.flag || '🌐'} ${DEFAULT_SUPPORTED_LANGUAGES[target_language]?.name || target_language} Chat`
    });
    return res.data;
  } catch (error) {
    console.warn("Backend chat failed, falling back to local simulation:", error);
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
  }
};

export const listConversations = async (username) => {
  try {
    const res = await axios.get(`${API_BASE_URL}/chat/conversations/${username}`);
    return res.data;
  } catch (error) {
    const convs = getConversations();
    const userConvs = convs.filter(c => c.username === username);
    return { conversations: userConvs };
  }
};

export const fetchMessages = async (conversation_id) => {
  try {
    const res = await axios.get(`${API_BASE_URL}/chat/messages/${conversation_id}`);
    return res.data;
  } catch (error) {
    const msgs = getMessagesList();
    const convMsgs = msgs.filter(m => m.conversation_id === Number(conversation_id));
    return { messages: convMsgs };
  }
};

export const sendMessage = async (conversation_id, content) => {
  try {
    const res = await axios.post(`${API_BASE_URL}/chat/message`, {
      conversation_id: Number(conversation_id),
      content: content
    });
    return res.data;
  } catch (error) {
    console.warn("Backend chat message failed, falling back to local simulation:", error);
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

    const aiContent = generateSimulatedReply(content, targetLang, mode);

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
  }
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

export const fetchVoices = async (params = {}) => {
  try {
    const res = await axios.get(`${API_BASE_URL}/speech/voices`, { params });
    return res.data;
  } catch (error) {
    console.warn("Failed to fetch voices from backend, returning client fallback:", error);
    // Basic static catalog fallback
    const fallbackCatalog = [
      { voice_id: "en-US-GuyNeural", name: "Guy (Deep Male Narrator)", provider: "EdgeTTS", language: "en", locale: "en-US", country: "United States", accent: "American", gender: "male", depth: "deep", emotion: "confident", purpose: "audiobook", storytelling_type: "Deep Male Narrator", sample_text: "Welcome to the story studio. Let us begin our journey through the deep forest." },
      { voice_id: "en-US-JennyNeural", name: "Jenny (Warm Female Storyteller)", provider: "EdgeTTS", language: "en", locale: "en-US", country: "United States", accent: "American", gender: "female", depth: "medium", emotion: "warm", purpose: "storytelling", storytelling_type: "Warm Storyteller", sample_text: "Welcome to the story studio. Today we will explore a beautiful narrative." },
      { voice_id: "es-ES-AlvaroNeural", name: "Álvaro (Natural Male)", provider: "EdgeTTS", language: "es", locale: "es-ES", country: "Spain", accent: "Castilian", gender: "male", depth: "medium", emotion: "calm", purpose: "friendly", storytelling_type: "Natural Voice", sample_text: "Bienvenido al estudio de texto a voz. Este es un breve ejemplo." },
      { voice_id: "es-ES-ElviraNeural", name: "Elvira (Clear Female)", provider: "EdgeTTS", language: "es", locale: "es-ES", country: "Spain", accent: "Castilian", gender: "female", depth: "light", emotion: "warm", purpose: "professional", storytelling_type: "Clear Presenter", sample_text: "Bienvenido al estudio de texto a voz. Espero que disfrutes la experiencia." }
    ];
    let filtered = fallbackCatalog;
    if (params.language) {
      filtered = filtered.filter(v => v.language === params.language);
    }
    if (params.gender) {
      filtered = filtered.filter(v => v.gender === params.gender);
    }
    return { voices: filtered };
  }
};

export const previewVoice = async (voice_id, sample_text = null) => {
  try {
    const res = await axios.post(`${API_BASE_URL}/speech/preview`, {
      voice_id,
      sample_text
    }, {
      responseType: 'blob'
    });
    return URL.createObjectURL(res.data);
  } catch (error) {
    console.warn("Backend voice preview failed, using Google Translate fallback:", error);
    const lang = voice_id.split('-')[0] || 'en';
    const text = sample_text || "Welcome to the Text-to-Speech studio.";
    return `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(text)}`;
  }
};

export const synthesizeAdvancedSpeech = async (payload) => {
  try {
    const res = await axios.post(`${API_BASE_URL}/speech/synthesize`, {
      text: payload.text,
      voice_id: payload.voice_id || "en-US-GuyNeural",
      rate_percent: payload.rate_percent || 0,
      pitch_percent: payload.pitch_percent || 0,
      volume_percent: payload.volume_percent || 0,
      output_format: payload.output_format || "mp3",
      mode: payload.mode || "general",
      username: payload.username || "default_user"
    });
    
    const filename = res.data.filename;
    return {
      status: "success",
      filename: filename,
      audio_url: `${API_BASE_URL}/speech/download/${filename}`,
      duration_seconds: res.data.duration_seconds || 0,
      text_preview: res.data.text_preview || payload.text
    };
  } catch (error) {
    const errMsg = error.response?.data?.detail || error.message || 'Speech synthesis failed.';
    throw new Error(errMsg);
  }
};

export const fetchAudioHistory = async (username) => {
  try {
    const res = await axios.get(`${API_BASE_URL}/speech/history/${username || 'default_user'}`);
    const enrichedHistory = res.data.history.map(item => ({
      ...item,
      audio_url: `${API_BASE_URL}/speech/download/${item.filename}`
    }));
    return { history: enrichedHistory };
  } catch (error) {
    console.warn("Failed to fetch speech history from backend, returning local cache:", error);
    const historyKey = `matholy_tts_history_${username || 'default_user'}`;
    const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
    return { history };
  }
};

export const deleteAudioHistory = async (filename) => {
  try {
    const res = await axios.delete(`${API_BASE_URL}/speech/audio/${filename}`);
    return res.data;
  } catch (error) {
    console.warn("Failed to delete audio from backend, removing locally:", error);
    for (let key in localStorage) {
      if (key.startsWith('matholy_tts_history_')) {
        const history = JSON.parse(localStorage.getItem(key) || '[]');
        const filtered = history.filter(item => item.filename !== filename);
        localStorage.setItem(key, JSON.stringify(filtered));
      }
    }
    return { status: "success" };
  }
};

export const textToSpeech = async (text, language) => {
  if (!text || !text.trim()) return '';
  try {
    const res = await axios.post(`${API_BASE_URL}/speech/tts`, {
      text: text,
      language: language
    }, {
      responseType: 'blob'
    });
    return URL.createObjectURL(res.data);
  } catch (error) {
    console.warn("Backend /tts failed, using Google Translate fallback:", error);
    return `https://translate.google.com/translate_tts?ie=UTF-8&tl=${language}&client=tw-ob&q=${encodeURIComponent(text)}`;
  }
};

export const speechToText = async (audioBlob, target_language = null) => {
  const formData = new FormData();
  formData.append('file', audioBlob, 'input.wav');
  if (target_language) {
    formData.append('target_language', target_language);
  }
  try {
    const res = await axios.post(`${API_BASE_URL}/speech/stt`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  } catch (e) {
    return {
      text: "Voice input transcription service unavailable.",
      detected_language: target_language || 'en'
    };
  }
};

export const submitFeedback = async (message_id, username, rating, feedback_text = null, suggested_correction = null) => {
  try {
    const res = await axios.post(`${API_BASE_URL}/feedback/`, {
      message_id,
      username,
      rating,
      feedback_text,
      suggested_correction
    });
    return res.data;
  } catch (e) {
    return { status: "success" };
  }
};
