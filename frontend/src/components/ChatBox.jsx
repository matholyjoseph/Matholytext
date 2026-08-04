import React, { useState, useRef, useEffect } from 'react';
import { Send, Volume2, VolumeX, Languages, ThumbsUp, ThumbsDown, Sparkles, Check } from 'lucide-react';
import VoiceRecorder from './VoiceRecorder';
import { textToSpeech, translateText, submitFeedback } from '../services/api';

const ChatBox = ({ messages, onSendMessage, selectedLang, username, languages }) => {
  const [input, setInput] = useState('');
  const [playingMsgId, setPlayingMsgId] = useState(null);
  const [translatedMap, setTranslatedMap] = useState({});
  const [feedbackGiven, setFeedbackGiven] = useState({});
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  };

  const handlePlayAudio = async (msgId, text, lang) => {
    if (playingMsgId === msgId) {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      setPlayingMsgId(null);
      return;
    }

    setPlayingMsgId(msgId);

    // 1. Try Native Browser SpeechSynthesis API
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      const cleanLang = lang || selectedLang || 'en';
      
      const langTagMap = {
        'en': 'en-US', 'es': 'es-ES', 'fr': 'fr-FR', 'de': 'de-DE', 'hi': 'hi-IN',
        'zh': 'zh-CN', 'ar': 'ar-SA', 'ja': 'ja-JP', 'ko': 'ko-KR', 'ru': 'ru-RU',
        'pt': 'pt-BR', 'it': 'it-IT', 'nl': 'nl-NL', 'pl': 'pl-PL', 'tr': 'tr-TR',
        'sw': 'sw', 'bn': 'bn-IN', 'ta': 'ta-IN', 'te': 'te-IN', 'ur': 'ur-PK'
      };
      
      utterance.lang = langTagMap[cleanLang] || cleanLang;
      utterance.rate = 0.9;

      utterance.onend = () => setPlayingMsgId(null);
      utterance.onerror = (e) => {
        console.warn("SpeechSynthesis error, falling back to API TTS:", e);
        fallbackApiTTS(msgId, text, cleanLang);
      };

      window.speechSynthesis.speak(utterance);
    } else {
      fallbackApiTTS(msgId, text, lang);
    }
  };

  const fallbackApiTTS = async (msgId, text, lang) => {
    try {
      const audioUrl = await textToSpeech(text, lang || selectedLang);
      const audio = new Audio(audioUrl);
      audio.onended = () => setPlayingMsgId(null);
      audio.onerror = () => setPlayingMsgId(null);
      await audio.play();
    } catch (e) {
      console.error("Audio playback error:", e);
      setPlayingMsgId(null);
    }
  };

  const handleToggleTranslate = async (msgId, text) => {
    if (translatedMap[msgId]) {
      const newMap = { ...translatedMap };
      delete newMap[msgId];
      setTranslatedMap(newMap);
      return;
    }

    try {
      const res = await translateText(text, 'en');
      setTranslatedMap(prev => ({ ...prev, [msgId]: res.translated_text }));
    } catch (e) {
      console.error("Translation error:", e);
    }
  };

  const handleFeedback = async (msgId, rating) => {
    try {
      await submitFeedback(msgId, username, rating);
      setFeedbackGiven(prev => ({ ...prev, [msgId]: rating }));
    } catch (e) {
      console.error("Feedback submission error:", e);
    }
  };

  return (
    <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', minWidth: 0 }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(17, 24, 39, 0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>Multilingual Conversation</h3>
            <p style={{ fontSize: '11px', color: '#9ca3af' }}>Active Language: <strong style={{ color: '#c084fc' }}>{languages[selectedLang]?.name || selectedLang}</strong></p>
          </div>
        </div>
        <span className="badge-tag">51 Languages Ready</span>
      </div>

      {/* Message History */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {messages.length === 0 ? (
          <div style={{ margin: 'auto', textAlign: 'center', color: '#9ca3af', maxWidth: '420px', padding: '20px' }}>
            <div style={{ background: 'rgba(139, 92, 246, 0.15)', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Sparkles size={28} color="#c084fc" />
            </div>
            <h4 style={{ color: '#fff', fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Start Practicing Any Language</h4>
            <p style={{ fontSize: '13px', lineHeight: '1.5', color: '#9ca3af' }}>
              Type or speak in English, Spanish, Mandarin, Hindi, Swahili, Arabic, or any of the 51 supported languages.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isUser = msg.sender === 'user';
            const msgId = msg.id || idx;
            const isRTL = languages[msg.detected_language]?.dir === 'rtl';

            return (
              <div 
                key={idx}
                style={{
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isUser ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px', display: 'flex', gap: '6px' }}>
                  <span style={{ fontWeight: 500 }}>{isUser ? 'You' : 'Matholy AI'}</span>
                  {msg.detected_language && <span style={{ color: '#c084fc' }}>({msg.detected_language.toUpperCase()})</span>}
                </div>

                <div 
                  style={{
                    padding: '14px 18px',
                    borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: isUser 
                      ? 'linear-gradient(135deg, #2563eb, #4f46e5)' 
                      : 'rgba(30, 41, 59, 0.9)',
                    border: isUser ? 'none' : '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#fff',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    direction: isRTL ? 'rtl' : 'ltr',
                    textAlign: isRTL ? 'right' : 'left',
                    userSelect: 'text'
                  }}
                >
                  {msg.content}

                  {translatedMap[msgId] && (
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed rgba(255, 255, 255, 0.2)', fontSize: '13px', color: '#cbd5e1' }}>
                      <strong style={{ color: '#93c5fd' }}>Translation:</strong> {translatedMap[msgId]}
                    </div>
                  )}
                </div>

                {/* Message Actions */}
                {!isUser && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                    <button 
                      onClick={() => handlePlayAudio(msgId, msg.content, msg.detected_language)}
                      className="icon-action-btn"
                      style={{ color: playingMsgId === msgId ? '#ec4899' : '#9ca3af' }}
                      title="Listen to pronunciation"
                    >
                      {playingMsgId === msgId ? <VolumeX size={14} color="#ec4899" /> : <Volume2 size={14} />}
                      <span style={{ color: playingMsgId === msgId ? '#ec4899' : '#9ca3af', fontWeight: playingMsgId === msgId ? 600 : 400 }}>
                        {playingMsgId === msgId ? 'Stop' : 'Audio'}
                      </span>
                    </button>
                    <button 
                      onClick={() => handleToggleTranslate(msgId, msg.content)}
                      className="icon-action-btn"
                      title="Translate text"
                    >
                      <Languages size={14} />
                      <span>{translatedMap[msgId] ? 'Hide' : 'Translate'}</span>
                    </button>
                    <button 
                      onClick={() => handleFeedback(msgId, 1)}
                      className="icon-action-btn"
                      style={{ color: feedbackGiven[msgId] === 1 ? '#10b981' : '#9ca3af' }}
                      title="Helpful response"
                    >
                      <ThumbsUp size={14} />
                    </button>
                    <button 
                      onClick={() => handleFeedback(msgId, -1)}
                      className="icon-action-btn"
                      style={{ color: feedbackGiven[msgId] === -1 ? '#ef4444' : '#9ca3af' }}
                      title="Needs improvement"
                    >
                      <ThumbsDown size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Bar */}
      <div style={{ padding: '14px 18px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(17, 24, 39, 0.6)' }}>
        <VoiceRecorder onTranscribe={(text) => onSendMessage(text)} selectedLang={selectedLang} />
        <input 
          type="text"
          placeholder={`Type message in ${languages[selectedLang]?.name || 'any language'}...`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          style={{
            flex: 1,
            background: 'rgba(255, 255, 255, 0.07)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '12px',
            padding: '12px 16px',
            color: '#fff',
            fontSize: '14px',
            outline: 'none',
            transition: 'border-color 0.2s'
          }}
        />
        <button onClick={handleSend} className="glow-btn" style={{ padding: '12px 20px', borderRadius: '12px' }}>
          <Send size={16} />
          <span>Send</span>
        </button>
      </div>
    </div>
  );
};

export default ChatBox;
