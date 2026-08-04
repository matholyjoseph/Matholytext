import React, { useState, useEffect } from 'react';
import LanguageSelector from './components/LanguageSelector';
import ChatBox from './components/ChatBox';
import LearningDashboard from './components/LearningDashboard';
import TranslationTool from './components/TranslationTool';
import GrammarTool from './components/GrammarTool';
import DictionaryTool from './components/DictionaryTool';
import TTSTool from './components/TTSTool';
import { fetchSupportedLanguages, createConversation, sendMessage } from './services/api';
import { DEFAULT_SUPPORTED_LANGUAGES } from './services/languages';
import { Globe, MessageSquare, BookOpen, Repeat, Search, Volume2, Menu, X } from 'lucide-react';
import './styles/globals.css';

function App() {
  const [languages, setLanguages] = useState(DEFAULT_SUPPORTED_LANGUAGES);
  const [selectedLang, setSelectedLang] = useState('es');
  const [username, setUsername] = useState('user1');
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [activeTab, setActiveTab] = useState('general'); // 'general', 'tutor', 'translator', 'dictionary', 'tts'
  const [ttsInputText, setTtsInputText] = useState('');
  const [ttsInputLang, setTtsInputLang] = useState('en');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    try {
      const langData = await fetchSupportedLanguages();
      if (langData && langData.languages) {
        setLanguages(langData.languages);
      }
      startNewConversation('es', 'general');
    } catch (e) {
      console.error("App init error:", e);
    }
  };

  const startNewConversation = async (langCode, selectedMode) => {
    try {
      const res = await createConversation(username, `${username}@matholy.ai`, langCode, selectedMode);
      setConversationId(res.conversation_id);
      setSelectedLang(langCode);
      setActiveTab(selectedMode);
      setMessages([]);
    } catch (e) {
      console.error("Error creating conversation:", e);
    }
  };

  const handleSendMessage = async (text) => {
    if (!conversationId) return;

    const tempUserMsg = { sender: 'user', content: text, detected_language: selectedLang };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await sendMessage(conversationId, text);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        res.user_message,
        res.assistant_message
      ]);
    } catch (e) {
      console.error("Error sending message:", e);
    }
  };

  const menuItems = [
    { id: 'general', label: 'Chat', icon: MessageSquare },
    { id: 'tutor', label: 'Tutor', icon: BookOpen },
    { id: 'translator', label: 'Translate', icon: Repeat },
    { id: 'dictionary', label: 'Dictionary', icon: Search },
    { id: 'tts', label: 'TTS', icon: Volume2 },
  ];

  return (
    <div className="app-container">
      <header
        className="glass-panel"
        style={{
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 50,
          gap: '10px',
          flexShrink: 0,
          overflow: 'visible',
        }}
      >
        {/* Logo + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #ec4899)',
              width: '36px',
              height: '36px',
              minWidth: '36px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
            }}
          >
            <Globe color="#fff" size={18} />
          </div>
          <div className="app-header-logo-text" style={{ minWidth: 0 }}>
            <h1
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: '#fff',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Matholy AI
            </h1>
            <p
              className="hide-mobile"
              style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px', whiteSpace: 'nowrap' }}
            >
              51 Languages • Neural Translation • Dictionary &amp; TTS
            </p>
          </div>
        </div>

        {/* Desktop Navbar Mode Switcher */}
        <nav
          className="desktop-menu-bar"
          style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '4px',
            borderRadius: '10px',
            gap: '4px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            flexShrink: 0,
          }}
        >
          {menuItems.map((m) => {
            const Icon = m.icon;
            const isActive = activeTab === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setActiveTab(m.id);
                  if (m.id === 'general' && messages.length === 0) {
                    startNewConversation(selectedLang, 'general');
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 13px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: isActive ? 'linear-gradient(135deg, #10b981, #3b82f6)' : 'transparent',
                  color: isActive ? '#fff' : '#9ca3af',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                <Icon size={14} />
                {m.label}
              </button>
            );
          })}
        </nav>

        {/* Right side: Language Selector + Mobile Hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <LanguageSelector
            languages={languages}
            selectedLang={selectedLang}
            onSelectLanguage={(lang) => {
              setSelectedLang(lang);
            }}
          />

          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            className="mobile-menu-toggle-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={{
              display: 'none',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              padding: '8px',
              color: '#fff',
              cursor: 'pointer',
              minWidth: '40px',
              minHeight: '40px',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Collapsible Mobile Menu Drawer */}
        {isMobileMenuOpen && (
          <div
            className="mobile-menu-drawer glass-panel"
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              right: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              padding: '12px',
              background: 'rgba(9, 13, 22, 0.98)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.7)',
              borderRadius: '12px',
              zIndex: 200,
            }}
          >
            {/* Current active tab indicator */}
            <div
              style={{
                fontSize: '11px',
                color: '#6b7280',
                paddingBottom: '6px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                marginBottom: '4px',
                fontWeight: 500,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
            >
              Navigation
            </div>
            {menuItems.map((m) => {
              const Icon = m.icon;
              const isActive = activeTab === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(m.id);
                    setIsMobileMenuOpen(false);
                    if (m.id === 'general' && messages.length === 0) {
                      startNewConversation(selectedLang, 'general');
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '13px 16px',
                    borderRadius: '10px',
                    border: isActive ? '1px solid rgba(59,130,246,0.4)' : '1px solid transparent',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(59,130,246,0.25))'
                      : 'rgba(255, 255, 255, 0.04)',
                    color: isActive ? '#fff' : '#d1d5db',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: isActive
                        ? 'linear-gradient(135deg, #10b981, #3b82f6)'
                        : 'rgba(255,255,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={16} color={isActive ? '#fff' : '#9ca3af'} />
                  </div>
                  <span>{m.label}</span>
                  {isActive && (
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: '10px',
                        color: '#10b981',
                        fontWeight: 700,
                        background: 'rgba(16,185,129,0.15)',
                        padding: '2px 8px',
                        borderRadius: '10px',
                      }}
                    >
                      ACTIVE
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Workspace Area */}
      <main className="app-main-layout">
        {activeTab === 'general' && (
          <ChatBox
            messages={messages}
            onSendMessage={handleSendMessage}
            selectedLang={selectedLang}
            username={username}
            languages={languages}
          />
        )}

        {activeTab === 'tutor' && (
          <GrammarTool
            languages={languages}
            selectedLang={selectedLang}
            username={username}
          />
        )}

        {activeTab === 'translator' && (
          <TranslationTool
            languages={languages}
            selectedLang={selectedLang}
            username={username}
            onOpenTTS={(text, lang) => {
              setTtsInputText(text);
              setTtsInputLang(lang);
              setActiveTab('tts');
            }}
          />
        )}

        {activeTab === 'dictionary' && (
          <DictionaryTool
            languages={languages}
            selectedLang={selectedLang}
          />
        )}

        {activeTab === 'tts' && (
          <TTSTool
            languages={languages}
            initialText={ttsInputText}
            initialLang={ttsInputLang}
            username={username}
          />
        )}

        <LearningDashboard
          username={username}
          selectedLang={selectedLang}
          languages={languages}
        />
      </main>
    </div>
  );
}

export default App;
