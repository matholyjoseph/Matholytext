import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

const LanguageSelector = ({ languages, selectedLang, onSelectLanguage }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  const langList = Object.entries(languages || {}).map(([code, meta]) => ({
    code,
    ...meta
  }));

  const filtered = langList.filter(l => 
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.native.toLowerCase().includes(search.toLowerCase()) ||
    l.code.toLowerCase().includes(search.toLowerCase())
  );

  const currentMeta = languages[selectedLang] || { name: 'Select Language', flag: '🌐', native: '' };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '260px', zIndex: 1000 }}>
      {/* Dropdown Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="glass-panel"
        type="button"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          padding: '8px 14px',
          color: '#fff',
          cursor: 'pointer',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          background: 'rgba(17, 24, 39, 0.9)',
          borderRadius: '12px',
          transition: 'all 0.2s ease',
          boxShadow: isOpen ? '0 0 12px rgba(139, 92, 246, 0.4)' : 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>{currentMeta.flag}</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 600, fontSize: '13px', lineHeight: '1.2' }}>{currentMeta.name}</div>
            <div style={{ fontSize: '11px', color: '#9ca3af' }}>{currentMeta.native}</div>
          </div>
        </div>
        <ChevronDown size={16} color="#9ca3af" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div 
          className="glass-panel"
          style={{
            position: 'absolute',
            top: '52px',
            right: 0,
            width: '290px',
            maxHeight: '360px',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            padding: '10px',
            background: '#0f172a',
            boxShadow: '0 16px 36px rgba(0, 0, 0, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            borderRadius: '14px'
          }}
        >
          {/* Search Box Header */}
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '8px 12px', 
              background: 'rgba(255, 255, 255, 0.1)', 
              borderRadius: '8px', 
              marginBottom: '10px',
              border: '1px solid rgba(255, 255, 255, 0.15)'
            }}
          >
            <Search size={15} color="#c084fc" />
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="Search 51 languages..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                outline: 'none',
                width: '100%',
                fontSize: '13px',
                fontFamily: 'inherit'
              }}
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                type="button"
                style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Languages Scrollable List */}
          <div style={{ overflowY: 'auto', flex: 1, paddingRight: '2px' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '16px', fontSize: '13px', color: '#9ca3af', textAlign: 'center' }}>
                No matching language found for "{search}"
              </div>
            ) : (
              filtered.map((l) => {
                const isSelected = selectedLang === l.code;
                return (
                  <div 
                    key={l.code}
                    onClick={() => {
                      onSelectLanguage(l.code);
                      setIsOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'space-between',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(139, 92, 246, 0.35)' : 'transparent',
                      marginBottom: '3px',
                      transition: 'all 0.15s ease',
                      border: isSelected ? '1px solid rgba(139, 92, 246, 0.5)' : '1px solid transparent'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '20px' }}>{l.flag}</span>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '13px', fontWeight: isSelected ? 600 : 500, color: '#fff' }}>{l.name}</div>
                        <div style={{ fontSize: '11px', color: '#9ca3af' }}>{l.native}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {l.dir === 'rtl' && <span className="badge-tag" style={{ fontSize: '9px', padding: '2px 5px' }}>RTL</span>}
                      {isSelected && <Check size={16} color="#c084fc" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
