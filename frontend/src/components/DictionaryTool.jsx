import React, { useState, useEffect } from 'react';
import { BookOpen, Search, Volume2, Sparkles, Globe, Copy, Check, VolumeX } from 'lucide-react';
import { lookupDictionary } from '../services/api';
import { DEFAULT_SUPPORTED_LANGUAGES } from '../services/languages';

const DictionaryTool = ({ languages = DEFAULT_SUPPORTED_LANGUAGES, selectedLang }) => {
  const [searchTerm, setSearchTerm] = useState('hello');
  const [searchResult, setSearchResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [error, setError] = useState(null);

  const activeLangs = languages && Object.keys(languages).length > 0 ? languages : DEFAULT_SUPPORTED_LANGUAGES;

  const handleSearch = async (wordToSearch) => {
    const query = (wordToSearch || searchTerm).trim();
    if (!query) return;

    setIsLoading(true);
    setError(null);
    setSearchResult(null);
    try {
      const data = await lookupDictionary(query);
      if (data && (data.found || data.translations || data.word)) {
        setSearchResult(data);
      } else {
        setError('Word not found. Check spelling or try another word.');
      }
    } catch (e) {
      console.warn("API dictionary lookup error:", e);
      setError('Word not found. Check spelling or try another word.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleSearch('hello');
  }, []);

  const handlePlayAudio = (textToSpeak) => {
    if (isPlayingAudio) {
      window.speechSynthesis?.cancel();
      setIsPlayingAudio(false);
      return;
    }

    setIsPlayingAudio(true);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak || searchResult?.word || 'hello');
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlayingAudio(false);
    }
  };

  const handleCopyTranslation = (code, text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const sampleWords = ["hello", "welcome", "knowledge", "language", "freedom", "friendship", "love", "peace"];

  return (
    <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', gap: '20px', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'linear-gradient(135deg, #10b981, #3b82f6)', padding: '10px', borderRadius: '12px' }}>
            <BookOpen size={22} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>English Dictionary & IPA Pronunciation Studio</h2>
            <p style={{ fontSize: '12px', color: '#9ca3af' }}>Lookup any English vocabulary term for phonetics and translations across 51 global languages</p>
          </div>
        </div>

        <span className="badge-tag" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
          51 Language Mappings
        </span>
      </div>

      {/* Search Bar */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
          <input 
            type="text"
            placeholder="Type any English word (e.g. love, freedom, peace, welcome, language)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{
              width: '100%',
              background: 'rgba(30, 41, 59, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '12px 16px 12px 42px',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 500,
              outline: 'none'
            }}
          />
          <Search size={18} color="#9ca3af" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
        </div>

        <button 
          onClick={() => handleSearch()}
          className="glow-btn"
          style={{ padding: '12px 24px', borderRadius: '12px' }}
        >
          <Search size={16} />
          <span>{isLoading ? 'Searching...' : 'Lookup Word'}</span>
        </button>
      </div>

      {/* Sample Words Chips */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: '#9ca3af' }}>Try looking up:</span>
        {sampleWords.map((word) => (
          <button 
            key={word}
            onClick={() => { setSearchTerm(word); handleSearch(word); }}
            className="icon-action-btn"
            style={{ fontSize: '12px', padding: '4px 10px' }}
          >
            {word}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '12px', color: '#fca5a5', textAlign: 'center', fontSize: '15px' }}>
          {error}
        </div>
      )}

      {/* Search Result */}
      {searchResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '20px', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(59, 130, 246, 0.4)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '26px', fontWeight: 800, color: '#fff', textTransform: 'capitalize' }}>
                  {searchResult.word}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 600, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.15)', padding: '4px 10px', borderRadius: '8px' }}>
                    IPA: {searchResult.ipa}
                  </span>
                  {searchResult.respelling && (
                    <span style={{ fontSize: '13px', color: '#c084fc' }}>
                      ({searchResult.respelling})
                    </span>
                  )}
                  <span style={{ fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    • {searchResult.part_of_speech}
                  </span>
                </div>
              </div>

              <button 
                onClick={() => handlePlayAudio(searchResult.word)}
                className="glow-btn"
                style={{ padding: '10px 18px', background: isPlayingAudio ? 'linear-gradient(135deg, #ec4899, #8b5cf6)' : 'linear-gradient(135deg, #10b981, #059669)' }}
              >
                {isPlayingAudio ? <VolumeX size={18} /> : <Volume2 size={18} />}
                <span>{isPlayingAudio ? 'Stop Pronunciation' : '🔊 Listen Pronunciation'}</span>
              </button>
            </div>

            {searchResult.definition && (
              <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '12px' }}>
                <p style={{ fontSize: '14px', color: '#e2e8f0', lineHeight: '1.6' }}>
                  <strong style={{ color: '#93c5fd' }}>Definition:</strong> {searchResult.definition}
                </p>
                {searchResult.example && (
                  <p style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic', marginTop: '6px' }}>
                    <strong style={{ color: '#cbd5e1' }}>Example:</strong> "{searchResult.example}"
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={18} color="#3b82f6" />
              <span>'{searchResult.word}' in 51 World Languages:</span>
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
              {Object.entries(activeLangs).map(([code, meta]) => {
                const transText = searchResult.translations?.[code] || `${searchResult.word} (${meta.native || meta.name})`;
                const isCopied = copiedCode === code;

                return (
                  <div 
                    key={code}
                    className="glass-panel"
                    style={{
                      padding: '12px 14px',
                      background: 'rgba(30, 41, 59, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'space-between',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      <span style={{ fontSize: '20px' }}>{meta.flag}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '11px', color: '#9ca3af' }}>{meta.name} ({meta.native}):</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#34d399', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: meta.dir === 'rtl' ? 'rtl' : 'ltr', textAlign: meta.dir === 'rtl' ? 'right' : 'left' }}>
                          {transText}
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleCopyTranslation(code, transText)}
                      className="icon-action-btn"
                      title="Copy translation"
                      style={{ padding: '6px' }}
                    >
                      {isCopied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DictionaryTool;
