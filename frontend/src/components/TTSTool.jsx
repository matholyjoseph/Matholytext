import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Play, Pause, Square, RotateCcw, Download, Sparkles, Filter, Search, Trash2, FileText, Check, ShieldCheck, RefreshCw, Layers, Sliders, Music } from 'lucide-react';
import { fetchVoices, synthesizeAdvancedSpeech, previewVoice, fetchAudioHistory, deleteAudioHistory } from '../services/api';
import { DEFAULT_SUPPORTED_LANGUAGES } from '../services/languages';

const TTSTool = ({ languages = DEFAULT_SUPPORTED_LANGUAGES, initialText = '', initialLang = 'en', username = 'default_user' }) => {
  // Input Text & Settings
  const [inputText, setInputText] = useState(initialText);
  const [selectedLang, setSelectedLang] = useState(initialLang || 'en');
  const [selectedVoiceId, setSelectedVoiceId] = useState('en-US-GuyNeural');
  const [ratePercent, setRatePercent] = useState(0);
  const [pitchPercent, setPitchPercent] = useState(0);
  const [volumePercent, setVolumePercent] = useState(0);
  const [outputFormat, setOutputFormat] = useState('mp3');
  const [speechMode, setSpeechMode] = useState('general');

  // Filters State
  const [genderFilter, setGenderFilter] = useState('all');
  const [depthFilter, setDepthFilter] = useState('all');
  const [purposeFilter, setPurposeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Voice Catalog State
  const [voices, setVoices] = useState([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [previewingVoiceId, setPreviewingVoiceId] = useState(null);

  // Audio Generation & Player State
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState(null);
  const [generatedFilename, setGeneratedFilename] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // History State
  const [history, setHistory] = useState([]);

  const audioRef = useRef(null);
  const activeLangs = languages && Object.keys(languages).length > 0 ? languages : DEFAULT_SUPPORTED_LANGUAGES;

  // Sync initialText if passed from TranslationTool
  useEffect(() => {
    if (initialText) {
      setInputText(initialText);
    }
    if (initialLang) {
      setSelectedLang(initialLang);
    }
  }, [initialText, initialLang]);

  // Load Voices & History on Mount and Filter change
  useEffect(() => {
    loadVoices();
  }, [selectedLang, genderFilter, depthFilter, purposeFilter, searchQuery]);

  useEffect(() => {
    loadHistory();
  }, [username]);

  const loadVoices = async () => {
    setIsLoadingVoices(true);
    try {
      const params = {
        language: selectedLang,
        gender: genderFilter !== 'all' ? genderFilter : undefined,
        depth: depthFilter !== 'all' ? depthFilter : undefined,
        purpose: purposeFilter !== 'all' ? purposeFilter : undefined,
        search: searchQuery.trim() || undefined
      };
      const data = await fetchVoices(params);
      if (data && data.voices) {
        setVoices(data.voices);
        if (data.voices.length > 0 && !data.voices.some(v => v.voice_id === selectedVoiceId)) {
          setSelectedVoiceId(data.voices[0].voice_id);
        }
      }
    } catch (e) {
      console.warn("Failed to load voice catalog:", e);
    } finally {
      setIsLoadingVoices(false);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await fetchAudioHistory(username);
      if (data && data.history) {
        setHistory(data.history);
      }
    } catch (e) {
      console.warn("Failed to load audio history:", e);
    }
  };

  const handlePreviewVoice = async (voiceId, e) => {
    e.stopPropagation();
    if (previewingVoiceId === voiceId) {
      setPreviewingVoiceId(null);
      return;
    }
    setPreviewingVoiceId(voiceId);
    try {
      const voice = voices.find(v => v.voice_id === voiceId);
      const text = voice ? voice.sample_text : "Welcome to the Text-to-Speech studio.";
      const audioUrl = await previewVoice(voiceId, text);
      const audio = new Audio(audioUrl);
      audio.onended = () => setPreviewingVoiceId(null);
      audio.onerror = () => setPreviewingVoiceId(null);
      audio.play();
    } catch (err) {
      console.warn("Voice preview error:", err);
      setPreviewingVoiceId(null);
    }
  };

  const handleGenerateSpeech = async () => {
    if (!inputText.trim()) return;
    setIsSynthesizing(true);
    setIsPlaying(false);

    try {
      const result = await synthesizeAdvancedSpeech({
        text: inputText,
        voice_id: selectedVoiceId,
        rate_percent: ratePercent,
        pitch_percent: pitchPercent,
        volume_percent: volumePercent,
        output_format: outputFormat,
        mode: speechMode,
        username: username
      });

      if (result) {
        const audioApiUrl = result.audio_url || `http://localhost:8000/api/v1/speech/download/${result.filename}`;
        setGeneratedAudioUrl(audioApiUrl);
        setGeneratedFilename(result.filename || 'speech.mp3');
        loadHistory();
      }
    } catch (err) {
      console.error("Speech synthesis failed:", err);
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail.map(d => d.msg).join(', ') : (err.message || 'Speech synthesis failed. Please try again.'));
      alert(msg);
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Audio Player Controls
  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const stopAudio = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
  };

  const restartAudio = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play();
    setIsPlaying(true);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e) => {
    const timeVal = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = timeVal;
      setCurrentTime(timeVal);
    }
  };

  const handleDeleteHistoryItem = async (filename) => {
    try {
      await deleteAudioHistory(filename);
      loadHistory();
    } catch (e) {
      console.error("Error deleting audio file:", e);
    }
  };

  const formatTime = (secs) => {
    if (isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const activeVoiceMeta = voices.find(v => v.voice_id === selectedVoiceId) || voices[0] || {};
  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
  const charCount = inputText.length;

  return (
    <div className="glass-panel tool-content-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', minWidth: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
          <div style={{ background: 'linear-gradient(135deg, #10b981, #3b82f6)', padding: '8px', borderRadius: '10px', flexShrink: 0 }}>
            <Volume2 size={18} color="#fff" />
          </div>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>TTS Studio</h2>
            <p className="hide-mobile" style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>Natural neural voices • 51 languages • Download audio</p>
          </div>
        </div>

        {/* Language Selector */}
        <select
          value={selectedLang}
          onChange={(e) => setSelectedLang(e.target.value)}
          style={{
            background: 'rgba(30, 41, 59, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '10px',
            padding: '8px 12px',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 600,
            outline: 'none',
            cursor: 'pointer',
            flexShrink: 0,
            maxWidth: '160px',
          }}
        >
          {Object.entries(activeLangs).map(([code, meta]) => (
            <option key={code} value={code}>
              {meta.flag} {meta.name}
            </option>
          ))}
        </select>
      </div>

      {/* Main Grid: Input & Voice Browser */}
      <div className="responsive-grid">
        {/* Left Column: Text Input & Speech Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 600 }}>Enter Text or Story Content</label>
            <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#6b7280' }}>
              <span>{charCount} chars</span>
              <span>•</span>
              <span>{wordCount} words</span>
            </div>
          </div>

          <textarea 
            placeholder="Enter or paste text, articles, stories, or translated document content..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            style={{
              minHeight: '180px',
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '14px',
              padding: '16px',
              color: '#fff',
              fontSize: '14px',
              lineHeight: '1.6',
              resize: 'none',
              outline: 'none'
            }}
          />

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button 
              onClick={async () => setInputText(await navigator.clipboard.readText())}
              className="icon-action-btn"
              style={{ fontSize: '12px' }}
            >
              Paste Text
            </button>
            <button 
              onClick={() => setInputText('')}
              className="icon-action-btn"
              style={{ fontSize: '12px', color: '#ef4444' }}
            >
              Clear Text
            </button>
          </div>

          {/* Speech Controls Panel */}
          <div style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#60a5fa' }}>
              <Sliders size={16} />
              <span>Voice Speech Controls</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                  Speaking Rate ({(1.0 + ratePercent / 100).toFixed(1)}x speed)
                </label>
                <input 
                  type="range" 
                  min="-40" 
                  max="50" 
                  value={ratePercent} 
                  onChange={(e) => setRatePercent(parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                  Voice Pitch ({pitchPercent === 0 ? 'Natural' : (pitchPercent > 0 ? `+${pitchPercent}% higher` : `${pitchPercent}% lower`)})
                </label>
                <input 
                  type="range" 
                  min="-30" 
                  max="30" 
                  value={pitchPercent} 
                  onChange={(e) => setPitchPercent(parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Output Audio Format</label>
                <select 
                  value={outputFormat} 
                  onChange={(e) => setOutputFormat(e.target.value)}
                  style={{ width: '100%', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '8px', padding: '6px 10px', color: '#fff', fontSize: '12px' }}
                >
                  <option value="mp3">MP3 Audio (.mp3)</option>
                  <option value="wav">WAV Audio (.wav)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Speaking Mode</label>
                <select 
                  value={speechMode} 
                  onChange={(e) => setSpeechMode(e.target.value)}
                  style={{ width: '100%', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '8px', padding: '6px 10px', color: '#fff', fontSize: '12px' }}
                >
                  <option value="general">General Speech</option>
                  <option value="storytelling">Storytelling & Narratives</option>
                  <option value="audiobook">Audiobook Narration</option>
                  <option value="news">News Announcement</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Voice Classification Browser */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 600 }}>Select Classified Neural Voice</label>
            <span style={{ fontSize: '11px', color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: '10px' }}>
              {voices.length} Voices Available
            </span>
          </div>

          {/* Filter Bar */}
          <div style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Search size={14} color="#9ca3af" />
              <input 
                type="text"
                placeholder="Search voice by name, accent, or style..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: '12px', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', padding: '4px 8px', color: '#fff', fontSize: '11px' }}>
                <option value="all">Gender: All</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="neutral">Neutral</option>
              </select>

              <select value={depthFilter} onChange={(e) => setDepthFilter(e.target.value)} style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', padding: '4px 8px', color: '#fff', fontSize: '11px' }}>
                <option value="all">Depth: All</option>
                <option value="deep">Deep / Thick</option>
                <option value="soft">Soft / Gentle</option>
                <option value="strong">Strong</option>
              </select>

              <select value={purposeFilter} onChange={(e) => setPurposeFilter(e.target.value)} style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', padding: '4px 8px', color: '#fff', fontSize: '11px' }}>
                <option value="all">Purpose: All</option>
                <option value="storytelling">Storytelling</option>
                <option value="audiobook">Audiobook</option>
                <option value="news">News</option>
                <option value="friendly">Friendly</option>
              </select>
            </div>
          </div>

          {/* Voice Cards Grid */}
          <div style={{ flex: 1, maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
            {voices.map((voice) => {
              const isSelected = selectedVoiceId === voice.voice_id;
              return (
                <div
                  key={voice.voice_id}
                  onClick={() => setSelectedVoiceId(voice.voice_id)}
                  style={{
                    background: isSelected ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2))' : 'rgba(15, 23, 42, 0.7)',
                    border: isSelected ? '1px solid rgba(59, 130, 246, 0.8)' : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '13px', color: '#fff' }}>{voice.name}</span>
                      <span style={{ fontSize: '10px', background: 'rgba(255, 255, 255, 0.1)', padding: '2px 6px', borderRadius: '6px', color: '#9ca3af' }}>
                        {voice.gender.toUpperCase()} • {voice.depth.toUpperCase()}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                      {voice.country} ({voice.accent}) • <strong style={{ color: '#c084fc' }}>{voice.storytelling_type}</strong>
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={(e) => handlePreviewVoice(voice.voice_id, e)}
                      style={{
                        background: previewingVoiceId === voice.voice_id ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        color: previewingVoiceId === voice.voice_id ? '#fca5a5' : '#fff',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}
                    >
                      <Volume2 size={14} />
                      <span>{previewingVoiceId === voice.voice_id ? 'Playing...' : 'Preview'}</span>
                    </button>

                    {isSelected && <Check size={18} color="#3b82f6" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Generate Speech Action */}
      <button 
        onClick={handleGenerateSpeech}
        disabled={isSynthesizing || !inputText.trim()}
        className="glow-btn"
        style={{ padding: '14px', fontSize: '15px' }}
      >
        {isSynthesizing ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} />}
        <span>{isSynthesizing ? 'Synthesizing Neural Speech...' : `Generate ${activeVoiceMeta.name || 'Speech'}`}</span>
      </button>

      {/* Hidden persistent audio element for mobile browser compatibility */}
      <audio 
        ref={audioRef}
        {...(generatedAudioUrl ? { src: generatedAudioUrl } : {})}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Audio Player & Download Controls */}
      {generatedAudioUrl && (
        <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(15, 23, 42, 0.95))', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Music size={20} color="#10b981" />
              <div>
                <span style={{ fontWeight: 700, color: '#fff', fontSize: '14px', display: 'block' }}>Audio Generated Successfully</span>
                <span style={{ fontSize: '11px', color: '#9ca3af' }}>{generatedFilename}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button onClick={togglePlayPause} style={{ background: '#10b981', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>

              <button onClick={stopAudio} style={{ background: 'rgba(255, 255, 255, 0.1)', border: 'none', color: '#fff', padding: '8px 12px', borderRadius: '10px', cursor: 'pointer' }} title="Stop">
                <Square size={16} />
              </button>

              <button onClick={restartAudio} style={{ background: 'rgba(255, 255, 255, 0.1)', border: 'none', color: '#fff', padding: '8px 12px', borderRadius: '10px', cursor: 'pointer' }} title="Restart">
                <RotateCcw size={16} />
              </button>

              <a href={generatedAudioUrl} target="_blank" rel="noopener noreferrer" download={generatedFilename} style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', textDecoration: 'none', padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Download size={16} />
                <span>Download {outputFormat.toUpperCase()}</span>
              </a>
            </div>
          </div>

          {/* Seek Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '11px', color: '#9ca3af', fontFamily: 'monospace' }}>{formatTime(currentTime)}</span>
            <input 
              type="range" 
              min="0" 
              max={duration || 100} 
              value={currentTime} 
              onChange={handleSeek}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: '11px', color: '#9ca3af', fontFamily: 'monospace' }}>{formatTime(duration)}</span>
          </div>
        </div>
      )}

      {/* Recent History Table */}
      {history.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 600 }}>Recent Audio Generations</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
            {history.map((item) => (
              <div key={item.id} style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ color: '#fff', fontWeight: 600 }}>"{item.text_preview}"</span>
                  <span style={{ color: '#6b7280', fontSize: '10px' }}>{item.voice_name} • {item.created_at?.slice(0, 10)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <a href={item.audio_url || `http://localhost:8000/api/v1/speech/download/${item.filename}`} target="_blank" rel="noopener noreferrer" download={item.filename} style={{ color: '#60a5fa', textDecoration: 'none' }}>Download</a>
                  <button onClick={() => handleDeleteHistoryItem(item.filename)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TTSTool;
