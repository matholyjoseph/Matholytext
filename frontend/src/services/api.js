import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000/api/v1';

export const fetchSupportedLanguages = async () => {
  const res = await axios.get(`${API_BASE}/detector/supported-languages`);
  return res.data;
};

export const detectLanguage = async (text) => {
  const res = await axios.post(`${API_BASE}/detector/`, { text });
  return res.data;
};

export const translateText = async (text, target_lang, source_lang = null) => {
  try {
    const res = await axios.post(`${API_BASE}/translate/`, { text, target_lang, source_lang });
    return res.data;
  } catch (error) {
    if (error.response) {
      error.message = `HTTP ${error.response.status}: ${error.response.data?.detail || error.message}`;
    }
    throw error;
  }
};

export const getProviderStatus = async () => {
  const res = await axios.get(`${API_BASE}/translate/providers/status`);
  return res.data;
};

export const suggestTranslation = async (original, source_lang, target_lang, current_translation, suggestion) => {
  const res = await axios.post(`${API_BASE}/corrections/`, {
    original_text: original,
    source_lang,
    target_lang,
    current_translation,
    suggested_translation: suggestion
  });
  return res.data;
};


export const scanDocument = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await axios.post(`${API_BASE}/translate/document/scan`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export const translateDocumentFile = async (file, target_language, source_language = 'auto') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('target_language', target_language);
  formData.append('source_language', source_language);
  
  const res = await axios.post(`${API_BASE}/translate/document/translate`, formData, {
    responseType: 'blob',
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 300000
  });
  return res.data;
};

export const lookupDictionary = async (word) => {
  const res = await axios.get(`${API_BASE}/dictionary/lookup?word=${encodeURIComponent(word)}`);
  return res.data;
};

export const createConversation = async (username, email, target_language, mode = 'general') => {
  const res = await axios.post(`${API_BASE}/chat/conversation`, { username, email, target_language, mode });
  return res.data;
};

export const listConversations = async (username) => {
  const res = await axios.get(`${API_BASE}/chat/conversations/${username}`);
  return res.data;
};

export const fetchMessages = async (conversation_id) => {
  const res = await axios.get(`${API_BASE}/chat/messages/${conversation_id}`);
  return res.data;
};

export const sendMessage = async (conversation_id, content) => {
  const res = await axios.post(`${API_BASE}/chat/message`, { conversation_id, content });
  return res.data;
};

export const checkGrammar = async (text, target_language, username) => {
  const res = await axios.post(`${API_BASE}/tutoring/grammar-check`, { text, target_language, username });
  return res.data;
};

export const addVocab = async (username, word, language, translation, example_sentence = null) => {
  const res = await axios.post(`${API_BASE}/tutoring/vocab/add`, { username, word, language, translation, example_sentence });
  return res.data;
};

export const fetchDueVocab = async (username, language = null) => {
  const url = language ? `${API_BASE}/tutoring/vocab/due/${username}?language=${language}` : `${API_BASE}/tutoring/vocab/due/${username}`;
  const res = await axios.get(url);
  return res.data;
};

export const reviewVocab = async (vocab_id, quality_score) => {
  const res = await axios.post(`${API_BASE}/tutoring/vocab/review`, { vocab_id, quality_score });
  return res.data;
};

export const speechToText = async (audioBlob, target_language = null) => {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.wav');
  if (target_language) {
    formData.append('target_language', target_language);
  }
  const res = await axios.post(`${API_BASE}/speech/stt`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export const textToSpeech = async (text, language) => {
  const res = await axios.post(`${API_BASE}/speech/tts`, { text, language }, { responseType: 'blob' });
  return URL.createObjectURL(res.data);
};

export const submitFeedback = async (message_id, username, rating, feedback_text = null, suggested_correction = null) => {
  const res = await axios.post(`${API_BASE}/feedback/`, { message_id, username, rating, feedback_text, suggested_correction });
  return res.data;
};

// Text-to-Speech Studio API Services
export const fetchVoices = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await axios.get(`${API_BASE}/speech/voices?${query}`);
  return res.data;
};

export const synthesizeAdvancedSpeech = async (payload) => {
  const res = await axios.post(`${API_BASE}/speech/synthesize`, payload);
  return res.data;
};

export const previewVoice = async (voice_id, sample_text = null) => {
  const res = await axios.post(`${API_BASE}/speech/preview`, { voice_id, sample_text }, { responseType: 'blob' });
  return URL.createObjectURL(res.data);
};

export const fetchAudioHistory = async (username) => {
  const res = await axios.get(`${API_BASE}/speech/history/${username}`);
  return res.data;
};

export const deleteAudioHistory = async (filename) => {
  const res = await axios.delete(`${API_BASE}/speech/audio/${filename}`);
  return res.data;
};
