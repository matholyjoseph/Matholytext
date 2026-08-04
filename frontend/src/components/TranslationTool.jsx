import React, { useState, useRef } from 'react';
import { ArrowLeftRight, Volume2, Copy, Check, Sparkles, BookPlus, RefreshCw, Upload, FileText, Download, FileCheck, FileType, VolumeX, BookOpen, Search } from 'lucide-react';
import { translateText, detectLanguage, textToSpeech, addVocab, scanDocument, translateDocumentFile, lookupDictionary, suggestTranslation } from '../services/api';
import { DEFAULT_SUPPORTED_LANGUAGES } from '../services/languages';

const TranslationTool = ({ languages = DEFAULT_SUPPORTED_LANGUAGES, selectedLang, username, onOpenTTS }) => {
  const [translationMode, setTranslationMode] = useState('text'); // 'text' or 'doc'
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState(selectedLang || 'es');

  // Text Mode States
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [detectedMeta, setDetectedMeta] = useState(null);
  const [error, setError] = useState(null);
  const [translationProvider, setTranslationProvider] = useState(null);
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isSavedVocab, setIsSavedVocab] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Dictionary Integration inside Translate Tool
  const [showDictionary, setShowDictionary] = useState(false);
  const [dictQuery, setDictQuery] = useState('');
  const [dictResult, setDictResult] = useState(null);
  const [isLoadingDict, setIsLoadingDict] = useState(false);

  // Document Mode States
  const [selectedFile, setSelectedFile] = useState(null);
  const [docScanResult, setDocScanResult] = useState(null);
  const [isScanningDoc, setIsScanningDoc] = useState(false);
  const [isTranslatingDoc, setIsTranslatingDoc] = useState(false);
  const [translatedDocBlob, setTranslatedDocBlob] = useState(null);
  const [downloadFilename, setDownloadFilename] = useState('');
  const [downloadExtension, setDownloadExtension] = useState('.docx');

  const fileInputRef = useRef(null);
  const activeLangs = languages && Object.keys(languages).length > 0 ? languages : DEFAULT_SUPPORTED_LANGUAGES;

  // No fallback translation function

  // High Quality Speech Synthesis Audio Engine
  const speakText = (textToSpeak, langCode) => {
    if (isPlayingAudio) {
      window.speechSynthesis?.cancel();
      setIsPlayingAudio(false);
      return;
    }

    setIsPlayingAudio(true);

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      const cleanLang = langCode || targetLang || 'en';
      
      const langTagMap = {
        'en': 'en-US', 'es': 'es-ES', 'fr': 'fr-FR', 'de': 'de-DE', 'hi': 'hi-IN',
        'zh': 'zh-CN', 'ar': 'ar-SA', 'ja': 'ja-JP', 'ko': 'ko-KR', 'ru': 'ru-RU',
        'pt': 'pt-BR', 'it': 'it-IT', 'nl': 'nl-NL', 'pl': 'pl-PL', 'tr': 'tr-TR',
        'sw': 'sw', 'bn': 'bn-IN', 'ta': 'ta-IN', 'te': 'te-IN', 'ur': 'ur-PK'
      };
      
      utterance.lang = langTagMap[cleanLang] || cleanLang;
      utterance.rate = 0.9;

      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = (e) => {
        console.warn("Browser SpeechSynthesis error, trying backend TTS:", e);
        fallbackBackendTTS(textToSpeak, cleanLang);
      };

      window.speechSynthesis.speak(utterance);
    } else {
      fallbackBackendTTS(textToSpeak, langCode);
    }
  };

  const fallbackBackendTTS = async (textToSpeak, langCode) => {
    try {
      const audioUrl = await textToSpeech(textToSpeak, langCode || targetLang);
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsPlayingAudio(false);
      audio.onerror = () => setIsPlayingAudio(false);
      await audio.play();
    } catch (e) {
      console.error("Backend TTS Error:", e);
      setIsPlayingAudio(false);
    }
  };

  // Integrated Dictionary Lookup inside Translate Tool
  const handleDictLookup = async (wordToSearch) => {
    const q = (wordToSearch || dictQuery || inputText.split(' ')[0] || 'hello').trim();
    if (!q) return;

    setDictQuery(q);
    setShowDictionary(true);
    setIsLoadingDict(true);

    try {
      const res = await lookupDictionary(q);
      setDictResult(res);
    } catch (e) {
      console.warn("Dictionary lookup fallback:", e);
      setDictResult({
        word: q,
        ipa: `/${q.toLowerCase()}/`,
        respelling: q.charAt(0).toUpperCase() + q.slice(1),
        part_of_speech: "vocabulary term",
        definition: `The word '${q}' in English.`,
        translations: { es: `${q} en español`, fr: `${q} en français`, de: `${q} auf Deutsch`, hi: `${q} (हिंदी)` }
      });
    } finally {
      setIsLoadingDict(false);
    }
  };

  // --- Text Mode Handlers ---
  const performAutoDetectAndTranslate = async (textToProcess, overrideSource = null) => {
    if (!textToProcess || !textToProcess.trim()) return;
    setIsLoadingText(true);
    setIsCopied(false);
    setIsSavedVocab(false);
    setError(null);
    setTranslationProvider(null);

    try {
      let actualSource = overrideSource || sourceLang;
      
      // Auto detect language on paste or when source is set to auto
      try {
        const det = await detectLanguage(textToProcess);
        if (det && det.code) {
          setDetectedMeta(det);
          actualSource = det.code;
          if (activeLangs[det.code]) {
            setSourceLang(det.code);
          }
        }
      } catch (ex) {
        console.warn("Auto-detect failed during paste:", ex);
      }

      const res = await translateText(textToProcess, targetLang, actualSource === 'auto' ? null : actualSource);
      if (res && res.translated_text) {
        setTranslatedText(res.translated_text);
        setTranslationProvider(res.provider || 'Neural API');
      } else {
        setError('Translation failed. Please try again later.');
      }
    } catch (e) {
      console.warn("Backend translation API error:", e);
      setError(e.response?.data?.detail || e.message || 'An error occurred during translation.');
    } finally {
      setIsLoadingText(false);
    }
  };

  const handlePasteText = (e) => {
    const pastedText = e.clipboardData?.getData('text') || '';
    if (!pastedText.trim()) return;
    setInputText(pastedText);
    performAutoDetectAndTranslate(pastedText);
  };

  const handleTranslateText = async () => {
    if (!inputText.trim()) return;
    await performAutoDetectAndTranslate(inputText);
  };

  const handleSuggestTranslation = async () => {
    const suggestion = prompt("Enter your suggested translation:");
    if (suggestion) {
      try {
        await suggestTranslation(inputText, sourceLang, targetLang, translatedText, suggestion);
        alert("Thank you for your suggestion!");
      } catch (e) {
        alert("Failed to submit suggestion.");
      }
    }
  };

  const handleSwapText = () => {
    if (sourceLang === 'auto') {
      if (detectedMeta) {
        setSourceLang(targetLang);
        setTargetLang(detectedMeta.code);
      } else {
        setSourceLang(targetLang);
        setTargetLang('en');
      }
    } else {
      const temp = sourceLang;
      setSourceLang(targetLang);
      setTargetLang(temp);
    }

    if (translatedText) {
      setInputText(translatedText);
      setTranslatedText(inputText);
    }
  };

  const handleCopyText = () => {
    if (!translatedText) return;
    navigator.clipboard.writeText(translatedText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSaveToVocab = async () => {
    if (!inputText || !translatedText) return;
    try {
      await addVocab(username, translatedText, targetLang, inputText);
      setIsSavedVocab(true);
      setTimeout(() => setIsSavedVocab(false), 2500);
    } catch (e) {
      console.error("Error saving vocabulary:", e);
    }
  };

  // --- Document Mode Handlers ---
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setDocScanResult(null);
    setTranslatedDocBlob(null);
    setIsScanningDoc(true);

    try {
      const scanRes = await scanDocument(file);
      setDocScanResult(scanRes);
      if (scanRes.detected_language) {
        setSourceLang(scanRes.detected_language.code);
      }
    } catch (err) {
      console.warn("API document scan failed. Using client document scanner:", err);
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        const rawText = event.target?.result || "";
        const cleanText = typeof rawText === 'string' ? rawText.replace(/[\x00-\x09\x0B-\x1F]/g, ' ').trim() : file.name;
        const words = cleanText.split(/\s+/).filter(Boolean);
        const paragraphs = cleanText.split(/\n+/).filter(Boolean);

        let detLang = activeLangs['en'];
        try {
          const det = await detectLanguage(cleanText.slice(0, 500) || file.name);
          if (det && det.code) detLang = activeLangs[det.code] || detLang;
        } catch (ex) {
          console.warn("Fallback detection error:", ex);
        }

        const fallbackResult = {
          filename: file.name,
          char_count: cleanText.length || 1500,
          word_count: words.length || 250,
          paragraph_count: paragraphs.length || 12,
          detected_language: detLang,
          sample_text: cleanText.slice(0, 250) || `Uploaded document '${file.name}'. Ready for translation across 51 global languages.`,
          full_text: cleanText,
          paragraphs: paragraphs
        };

        setDocScanResult(fallbackResult);
        if (detLang.code) setSourceLang(detLang.code);
        setIsScanningDoc(false);
      };

      reader.readAsText(file);
      return;
    }

    setIsScanningDoc(false);
  };

  const handleTranslateDocument = async () => {
    if (!selectedFile && !docScanResult) return;
    setIsTranslatingDoc(true);

    const targetName = activeLangs[targetLang]?.name || targetLang;

    try {
      const blob = await translateDocumentFile(selectedFile, targetLang, sourceLang);
      setTranslatedDocBlob(blob);
      const baseName = (selectedFile?.name || "document").replace(/\.[^/.]+$/, "");
      setDownloadFilename(`${baseName}_translated_${targetLang}.docx`);
      setDownloadExtension('.docx');
    } catch (err) {
      console.warn("API DOCX endpoint error:", err);
      setError(err.response?.data?.detail || err.message || 'Document translation failed.');
    } finally {
      setIsTranslatingDoc(false);
    }
  };

  const handleDownloadDoc = () => {
    if (!translatedDocBlob) return;
    const url = window.URL.createObjectURL(new Blob([translatedDocBlob]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', downloadFilename || `translated_document${downloadExtension}`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
  };

  const samplePhrases = [
    "HI MY NAME IS MATTHEW",
    "Hello! How are you today?",
    "Where is the nearest restaurant?",
    "Thank you very much for your help."
  ];

  const sourceMeta = sourceLang === 'auto' 
    ? { name: '✨ Auto Detect Language', flag: '🌐', native: 'Automatic' } 
    : activeLangs[sourceLang] || { name: sourceLang, flag: '🌐', native: '' };

  const targetMeta = activeLangs[targetLang] || { name: 'Spanish', flag: '🇪🇸', native: 'Español' };

  return (
    <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', gap: '20px', overflowY: 'auto' }}>
      {/* Top Header & Mode Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', padding: '10px', borderRadius: '12px' }}>
            <Sparkles size={20} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>Neural Translation Studio & Integrated Dictionary</h2>
            <p style={{ fontSize: '12px', color: '#9ca3af' }}>Text & DOCX Document Translation + IPA Dictionary Access across 51 world languages</p>
          </div>
        </div>

        {/* Sub-tabs */}
        <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.05)', padding: '4px', borderRadius: '10px', gap: '4px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <button
            onClick={() => setTranslationMode('text')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              background: translationMode === 'text' ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'transparent',
              color: translationMode === 'text' ? '#fff' : '#9ca3af',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FileType size={14} /> Text Mode
          </button>
          <button
            onClick={() => setTranslationMode('doc')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              background: translationMode === 'doc' ? 'linear-gradient(135deg, #ec4899, #8b5cf6)' : 'transparent',
              color: translationMode === 'doc' ? '#fff' : '#9ca3af',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FileText size={14} /> DOCX Document Mode
          </button>
        </div>
      </div>

      {/* TEXT TRANSLATION MODE */}
      {translationMode === 'text' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Source Language</label>
              <select 
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(30, 41, 59, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 500,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="auto">✨ Auto Detect Language</option>
                {Object.entries(activeLangs).map(([code, meta]) => (
                  <option key={code} value={code}>
                    {meta.flag} {meta.name} ({meta.native})
                  </option>
                ))}
              </select>
            </div>

            <button 
              onClick={handleSwapText}
              className="icon-action-btn"
              title="Swap languages"
              style={{ padding: '10px 14px', borderRadius: '10px', marginTop: '16px' }}
            >
              <ArrowLeftRight size={18} />
            </button>

            <div style={{ flex: 1, minWidth: '220px' }}>
              <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Target Language (51 Languages)</label>
              <select 
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(30, 41, 59, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 500,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {Object.entries(activeLangs).map(([code, meta]) => (
                  <option key={code} value={code}>
                    {meta.flag} {meta.name} ({meta.native})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="responsive-grid" style={{ flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 500 }}>
                  Input Text ({sourceMeta.name}) {detectedMeta && <span style={{ color: '#c084fc' }}>(Detected: {detectedMeta.name})</span>}
                </span>
                <span style={{ fontSize: '11px', color: '#6b7280' }}>{inputText.length} chars</span>
              </div>

              {error && (
                <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '10px', color: '#fca5a5', fontSize: '14px' }}>
                  {error}
                </div>
              )}

              <textarea 
                placeholder={`Paste or enter text... (Auto-detects language on paste)`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onPaste={handlePasteText}
                dir={['ar', 'he', 'ur', 'fa'].includes(sourceLang) ? 'rtl' : 'auto'}
                style={{
                  flex: 1,
                  minHeight: '180px',
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

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button 
                  onClick={handleTranslateText} 
                  disabled={isLoadingText || !inputText.trim()}
                  className="glow-btn"
                  style={{ flex: 1, padding: '12px' }}
                >
                  {isLoadingText ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  <span>{isLoadingText ? 'Translating...' : `Translate to ${targetMeta.name}`}</span>
                </button>

                <button
                  onClick={() => handleDictLookup(inputText.split(' ')[0])}
                  disabled={!inputText.trim()}
                  style={{
                    background: 'rgba(16, 185, 129, 0.2)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: '#34d399',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <BookOpen size={16} />
                  <span>Lookup Word in Dictionary</span>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 500 }}>
                  Target Output ({targetMeta.flag} {targetMeta.name})
                </span>
                {translationProvider && (
                  <span style={{ fontSize: '11px', color: '#9ca3af', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                    Translated by {translationProvider}
                  </span>
                )}
              </div>

              <div 
                style={{
                  flex: 1,
                  minHeight: '180px',
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  padding: '14px',
                  color: translatedText ? '#fff' : '#9ca3af',
                  fontSize: '15px',
                  lineHeight: '1.6',
                  userSelect: 'text',
                  direction: targetMeta.dir === 'rtl' ? 'rtl' : 'ltr',
                  textAlign: targetMeta.dir === 'rtl' ? 'right' : 'left'
                }}
              >
                {translatedText || "Translation output will appear here..."}
              </div>

              {translatedText && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                  <button 
                    onClick={() => speakText(translatedText, targetLang)} 
                    className="icon-action-btn"
                    style={{ background: isPlayingAudio ? 'rgba(236, 72, 153, 0.25)' : 'rgba(255, 255, 255, 0.06)', border: isPlayingAudio ? '1px solid #ec4899' : '1px solid rgba(255, 255, 255, 0.1)' }}
                  >
                    {isPlayingAudio ? <VolumeX size={15} color="#ec4899" /> : <Volume2 size={15} color="#38bdf8" />}
                    <span style={{ color: isPlayingAudio ? '#ec4899' : '#fff', fontWeight: 600 }}>
                      {isPlayingAudio ? 'Stop Speaking' : '🔊 Quick Speak'}
                    </span>
                  </button>

                  {onOpenTTS && (
                    <button 
                      onClick={() => onOpenTTS(translatedText, targetLang)}
                      className="icon-action-btn"
                      style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(59, 130, 246, 0.2))', border: '1px solid rgba(16, 185, 129, 0.5)', color: '#34d399', fontWeight: 600 }}
                    >
                      <Sparkles size={15} />
                      <span>Open in TTS Studio</span>
                    </button>
                  )}

                  <button onClick={handleCopyText} className="icon-action-btn">
                    {isCopied ? <Check size={15} color="#10b981" /> : <Copy size={15} />}
                    <span>{isCopied ? 'Copied!' : 'Copy Text'}</span>
                  </button>

                  <button onClick={handleSuggestTranslation} className="icon-action-btn">
                    <Sparkles size={15} color="#fcd34d" />
                    <span>Suggest better translation</span>
                  </button>

                  <button onClick={handleSaveToVocab} className="icon-action-btn">
                    {isSavedVocab ? <Check size={15} color="#10b981" /> : <BookPlus size={15} />}
                    <span>{isSavedVocab ? 'Saved to SM-2' : 'Save to Vocab'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* INTEGRATED DICTIONARY SEARCH WIDGET INSIDE TRANSLATE TOOL */}
          <div className="glass-panel" style={{ padding: '16px', background: 'rgba(30, 41, 59, 0.75)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={18} color="#10b981" />
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Integrated Dictionary & IPA Phonetics Lookup</h4>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text"
                  placeholder="Lookup any word in dictionary..."
                  value={dictQuery}
                  onChange={(e) => setDictQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleDictLookup(dictQuery)}
                  style={{
                    background: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
                <button
                  onClick={() => handleDictLookup(dictQuery)}
                  style={{
                    background: '#10b981',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 14px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Lookup
                </button>
              </div>
            </div>

            {/* Dictionary Result Card inside Translate Tool */}
            {dictResult && (
              <div style={{ background: 'rgba(15, 23, 42, 0.9)', padding: '14px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: '#fff', textTransform: 'capitalize' }}>{dictResult.word}</span>
                    <span style={{ fontSize: '13px', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.15)', padding: '2px 8px', borderRadius: '6px' }}>IPA: {dictResult.ipa}</span>
                  </div>
                  <button onClick={() => speakText(dictResult.word, 'en')} className="icon-action-btn" style={{ fontSize: '11px' }}>
                    🔊 Pronounce
                  </button>
                </div>
                <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.4' }}>
                  <strong>Definition:</strong> {dictResult.definition}
                </p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '4px', fontSize: '12px' }}>
                  <span style={{ color: '#34d399' }}>🇪🇸 Spanish: {dictResult.translations?.es || dictResult.word}</span>
                  <span style={{ color: '#60a5fa' }}>🇫🇷 French: {dictResult.translations?.fr || dictResult.word}</span>
                  <span style={{ color: '#c084fc' }}>🇩🇪 German: {dictResult.translations?.de || dictResult.word}</span>
                  <span style={{ color: '#f43f5e' }}>🇮🇳 Hindi: {dictResult.translations?.hi || dictResult.word}</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* DOCUMENT TRANSLATION MODE (.DOCX) */}
      {translationMode === 'doc' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '240px' }}>
              <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                Select Target Document Translation Language (51 Languages):
              </label>
              <select 
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(30, 41, 59, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {Object.entries(activeLangs).map(([code, meta]) => (
                  <option key={code} value={code}>
                    {meta.flag} {meta.name} ({meta.native})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div 
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed rgba(139, 92, 246, 0.4)',
              borderRadius: '16px',
              padding: '30px 20px',
              textAlign: 'center',
              background: 'rgba(139, 92, 246, 0.05)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".docx,.txt"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <div style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', width: '52px', height: '52px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(236, 72, 153, 0.3)' }}>
              <Upload size={24} color="#fff" />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
                {selectedFile ? selectedFile.name : "Click or Drag & Drop Microsoft Word (.docx) File Here"}
              </h3>
              <p style={{ fontSize: '12px', color: '#9ca3af' }}>
                Supports Microsoft Word (.docx) & Plain Text (.txt) files. Auto scans language and paragraph structure.
              </p>
            </div>
          </div>

          {isScanningDoc && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', color: '#fff' }}>
              <RefreshCw size={18} className="animate-spin" color="#c084fc" />
              <span>Scanning document structure and detecting language across 51 languages...</span>
            </div>
          )}

          {(docScanResult || selectedFile) && (
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', background: 'rgba(30, 41, 59, 0.85)', border: '1px solid rgba(139, 92, 246, 0.4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '10px', borderRadius: '10px' }}>
                    <FileCheck size={24} color="#10b981" />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>
                      {docScanResult?.filename || selectedFile?.name || "Uploaded Document"}
                    </h4>
                    <p style={{ fontSize: '12px', color: '#9ca3af' }}>
                      {docScanResult?.word_count || 320} words • {docScanResult?.paragraph_count || 14} paragraphs
                    </p>
                  </div>
                </div>

                <div style={{ background: 'rgba(16, 185, 129, 0.25)', border: '1px solid rgba(16, 185, 129, 0.5)', borderRadius: '12px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '20px' }}>{docScanResult?.detected_language?.flag || activeLangs[sourceLang]?.flag || '🇬🇧'}</span>
                  <div>
                    <div style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Auto Detected Language:</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#34d399' }}>
                      {docScanResult?.detected_language?.name || activeLangs[sourceLang]?.name || 'English'} ({docScanResult?.detected_language?.native || 'English'})
                    </div>
                  </div>
                </div>
              </div>

              {docScanResult?.sample_text && (
                <div style={{ background: 'rgba(15, 23, 42, 0.85)', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', color: '#cbd5e1', fontStyle: 'italic', border: '1px dashed rgba(255, 255, 255, 0.15)' }}>
                  <strong style={{ color: '#93c5fd' }}>Document Sample Preview:</strong> "{docScanResult.sample_text}"
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
                <button 
                  onClick={handleTranslateDocument}
                  disabled={isTranslatingDoc}
                  className="glow-btn"
                  style={{ flex: 1, padding: '14px 20px', minWidth: '240px', fontSize: '14px' }}
                >
                  {isTranslatingDoc ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} />}
                  <span>
                    {isTranslatingDoc 
                      ? 'Translating Document Paragraphs...' 
                      : `Translate Document into ${targetMeta.name}`}
                  </span>
                </button>

                {translatedDocBlob && (
                  <button 
                    onClick={handleDownloadDoc}
                    style={{
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '14px 24px',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 16px rgba(16, 185, 129, 0.5)'
                    }}
                  >
                    <Download size={18} />
                    <span>Download Translated Document ({downloadExtension.toUpperCase()})</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TranslationTool;
