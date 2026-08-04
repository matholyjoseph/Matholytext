import React, { useState } from 'react';
import { BookOpen, CheckCircle, Volume2, Sparkles, RefreshCw, Copy, Check } from 'lucide-react';
import { checkGrammar, detectLanguage, textToSpeech } from '../services/api';

const GrammarTool = ({ languages, selectedLang, username }) => {
  const [targetLang, setTargetLang] = useState(selectedLang || 'en');
  const [inputText, setInputText] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    setAnalysisResult(null);

    let activeLang = targetLang;
    try {
      // Auto detect language of input if target is set to en or default
      const det = await detectLanguage(inputText);
      if (det && det.code && languages[det.code]) {
        activeLang = det.code;
        setTargetLang(det.code);
      }
    } catch (e) {
      console.warn("Language detection fallback:", e);
    }

    try {
      const res = await checkGrammar(inputText, activeLang, username);
      setAnalysisResult(res);
    } catch (e) {
      console.error("Grammar check error:", e);
      setAnalysisResult({
        analysis_and_correction: "Grammar analysis error. Please ensure backend is connected.",
        corrected_text: inputText,
        has_errors: false,
        ipa_transcription: "",
        phonetic_respelling: ""
      });
    } finally {
      setIsLoading(false);
    }
  };

  const speakText = (textToSpeak) => {
    if (!textToSpeak) return;
    if (isPlayingAudio) {
      window.speechSynthesis?.cancel();
      setIsPlayingAudio(false);
      return;
    }

    setIsPlayingAudio(true);

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      
      const langTagMap = {
        'en': 'en-US', 'es': 'es-ES', 'fr': 'fr-FR', 'de': 'de-DE', 'hi': 'hi-IN',
        'zh': 'zh-CN', 'ar': 'ar-SA', 'ja': 'ja-JP', 'ko': 'ko-KR', 'ru': 'ru-RU',
        'pt': 'pt-BR', 'it': 'it-IT', 'nl': 'nl-NL', 'pl': 'pl-PL', 'tr': 'tr-TR'
      };

      utterance.lang = langTagMap[targetLang] || targetLang || 'en-US';
      utterance.rate = 0.9;
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = (err) => {
        console.warn("Browser SpeechSynthesis error, using fallback TTS:", err);
        fallbackBackendTTS(textToSpeak);
      };
      window.speechSynthesis.speak(utterance);
    } else {
      fallbackBackendTTS(textToSpeak);
    }
  };

  const fallbackBackendTTS = async (textToSpeak) => {
    try {
      const audioUrl = await textToSpeech(textToSpeak, targetLang);
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsPlayingAudio(false);
      audio.onerror = () => setIsPlayingAudio(false);
      await audio.play();
    } catch (e) {
      console.error("Backend TTS Error:", e);
      setIsPlayingAudio(false);
    }
  };

  const handleCopyCorrected = () => {
    if (!analysisResult?.corrected_text) return;
    navigator.clipboard.writeText(analysisResult.corrected_text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const sampleSentences = [
    { text: "She do not like cold weather.", lang: "en" },
    { text: "Yo ir a la tienda ayer.", lang: "es" },
    { text: "Je suis aller au cinéma demain.", lang: "fr" }
  ];

  const langMeta = languages[targetLang] || { name: 'English', flag: '🇬🇧' };

  return (
    <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', gap: '20px', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', padding: '10px', borderRadius: '12px' }}>
            <BookOpen size={20} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>Grammar, Punctuation & Phonetic Sounds Studio</h2>
            <p style={{ fontSize: '12px', color: '#9ca3af' }}>Analyze sentence structure, punctuation marks, spelling, and listen to authentic sound pronunciation</p>
          </div>
        </div>

        {/* Target Language Selector */}
        <select 
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
          style={{
            background: 'rgba(30, 41, 59, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '10px',
            padding: '8px 14px',
            color: '#fff',
            fontSize: '13px',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          {Object.entries(languages || {}).map(([code, meta]) => (
            <option key={code} value={code}>
              {meta.flag} {meta.name} ({meta.native})
            </option>
          ))}
        </select>
      </div>

      {/* Input Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 500 }}>
          Enter a sentence in {langMeta.name} to evaluate:
        </label>
        <textarea 
          placeholder={`Type a sentence in ${langMeta.name} (e.g. "She do not like cold weather" or "Yo ir a la tienda")...`}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          style={{
            minHeight: '120px',
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '12px',
            padding: '14px',
            color: '#fff',
            fontSize: '14px',
            lineHeight: '1.6',
            resize: 'none',
            outline: 'none'
          }}
        />

        <button 
          onClick={handleAnalyze} 
          disabled={isLoading || !inputText.trim()}
          className="glow-btn"
          style={{ padding: '12px' }}
        >
          {isLoading ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
          <span>{isLoading ? 'Analyzing Grammar, Punctuation & Sounds...' : 'Analyze Grammar, Punctuation & Sounds'}</span>
        </button>
      </div>

      {/* Prominent Corrected Grammar Display Card */}
      {analysisResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Dedicated Corrected Sentence Box */}
          <div 
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(15, 23, 42, 0.95))',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: '14px',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={15} /> Corrected Sentence (Grammar & Punctuation Fixed):
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleCopyCorrected}
                  className="icon-action-btn"
                  title="Copy Corrected Sentence"
                  style={{ padding: '6px 10px', fontSize: '12px' }}
                >
                  {isCopied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                  <span>{isCopied ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  onClick={() => speakText(analysisResult.corrected_text)}
                  style={{
                    background: isPlayingAudio ? 'rgba(239, 68, 68, 0.25)' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                    border: 'none',
                    color: '#fff',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
                  }}
                >
                  <Volume2 size={16} />
                  <span>{isPlayingAudio ? 'Stop Sound' : `Listen ${langMeta.name} Sound`}</span>
                </button>
              </div>
            </div>

            <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', lineHeight: '1.5', userSelect: 'text', padding: '6px 0' }}>
              {analysisResult.corrected_text}
            </div>

            {(analysisResult.ipa_transcription || analysisResult.phonetic_respelling) && (
              <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#9ca3af', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '8px', flexWrap: 'wrap' }}>
                {analysisResult.ipa_transcription && <span>IPA: <strong style={{ color: '#c084fc' }}>{analysisResult.ipa_transcription}</strong></span>}
                {analysisResult.phonetic_respelling && <span>Sound Guide: <strong style={{ color: '#60a5fa' }}>{analysisResult.phonetic_respelling}</strong></span>}
              </div>
            )}
          </div>

          {/* Full Breakdown Explanation */}
          <div 
            style={{
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '14px',
              padding: '18px',
              color: '#fff',
              fontSize: '14px',
              lineHeight: '1.7',
              whiteSpace: 'pre-wrap',
              userSelect: 'text'
            }}
          >
            {analysisResult.analysis_and_correction}
          </div>
        </div>
      )}

      {/* Preset Practice Sentences */}
      <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '14px' }}>
        <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>Test sample practice sentences with intentional errors:</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {sampleSentences.map((s, i) => (
            <button 
              key={i}
              onClick={() => {
                setInputText(s.text);
                setTargetLang(s.lang);
              }}
              className="icon-action-btn"
              style={{ fontSize: '12px' }}
            >
              "{s.text}" ({s.lang.toUpperCase()})
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GrammarTool;
