import React, { useState, useEffect } from 'react';
import { BookOpen, CheckCircle, Award, Plus, Eye, EyeOff } from 'lucide-react';
import { fetchDueVocab, reviewVocab, addVocab } from '../services/api';

const LearningDashboard = ({ username, selectedLang, languages }) => {
  const [dueVocab, setDueVocab] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [newTranslation, setNewTranslation] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadDueVocab();
  }, [username, selectedLang]);

  const loadDueVocab = async () => {
    try {
      const res = await fetchDueVocab(username, selectedLang);
      setDueVocab(res.due_items || []);
      setCurrentIndex(0);
      setShowAnswer(false);
    } catch (e) {
      console.error("Failed loading due vocab:", e);
    }
  };

  const handleScoreReview = async (e, qualityScore) => {
    e.stopPropagation(); // Stop triggering card flip
    if (dueVocab.length === 0) return;
    const currentItem = dueVocab[currentIndex];
    try {
      await reviewVocab(currentItem.id, qualityScore);
      if (currentIndex + 1 < dueVocab.length) {
        setCurrentIndex(currentIndex + 1);
        setShowAnswer(false);
      } else {
        loadDueVocab();
      }
    } catch (err) {
      console.error("Error rating SM-2 flashcard:", err);
    }
  };

  const handleAddWord = async () => {
    if (!newWord.trim() || !newTranslation.trim()) return;
    try {
      await addVocab(username, newWord, selectedLang, newTranslation);
      setNewWord('');
      setNewTranslation('');
      setIsAdding(false);
      loadDueVocab();
    } catch (e) {
      console.error("Error adding word:", e);
    }
  };

  const currentItem = dueVocab[currentIndex];
  const langMeta = languages[selectedLang] || { name: selectedLang, flag: '🌐' };

  return (
    <div className="learning-dashboard-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', flexShrink: 0 }}>
      {/* Stats Header */}
      <div className="glass-panel" style={{ padding: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award color="#f59e0b" size={18} />
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>SM-2 Learning Stats</h3>
          </div>
          <span style={{ fontSize: '20px' }}>{langMeta.flag}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '10px', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#8b5cf6' }}>{dueVocab.length}</div>
            <div style={{ fontSize: '11px', color: '#9ca3af' }}>Cards Due Today</div>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '10px', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>94%</div>
            <div style={{ fontSize: '11px', color: '#9ca3af' }}>Retention Rate</div>
          </div>
        </div>
      </div>

      {/* Flashcard Component */}
      <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen color="#3b82f6" size={18} />
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>Spaced Repetition</h4>
          </div>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="icon-action-btn"
            style={{ fontSize: '11px', padding: '4px 8px' }}
          >
            <Plus size={12} /> Add Word
          </button>
        </div>

        {isAdding && (
          <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '12px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <input 
              placeholder={`Word in ${langMeta.name}`} 
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '8px 10px', borderRadius: '6px', fontSize: '12px', outline: 'none' }}
            />
            <input 
              placeholder="English Translation" 
              value={newTranslation}
              onChange={(e) => setNewTranslation(e.target.value)}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '8px 10px', borderRadius: '6px', fontSize: '12px', outline: 'none' }}
            />
            <button onClick={handleAddWord} className="glow-btn" style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }}>
              Save Word
            </button>
          </div>
        )}

        {dueVocab.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 10px', color: '#9ca3af' }}>
            <CheckCircle size={32} color="#10b981" style={{ marginBottom: '8px', margin: '0 auto' }} />
            <p style={{ fontSize: '13px', color: '#fff', fontWeight: 500 }}>Cards Complete for Today!</p>
            <p style={{ fontSize: '11px', marginTop: '4px', color: '#9ca3af' }}>Add new vocabulary cards to expand your memory curve.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Card Content Area */}
            <div 
              onClick={() => setShowAnswer(!showAnswer)}
              style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.9))',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                padding: '20px 14px',
                textAlign: 'center',
                cursor: 'pointer',
                minHeight: '120px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justify: 'center',
                transition: 'all 0.2s ease',
                userSelect: 'none'
              }}
            >
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                {currentItem.word}
              </div>
              
              {showAnswer ? (
                <div style={{ fontSize: '14px', color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Eye size={14} />
                  <span>{currentItem.translation}</span>
                </div>
              ) : (
                <div style={{ fontSize: '11px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <EyeOff size={12} />
                  <span>Tap to reveal translation</span>
                </div>
              )}
            </div>

            {/* Score Buttons (0-5) */}
            {showAnswer && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center' }}>Rate memory recall score:</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                  {[1, 2, 3, 4, 5].map((score) => (
                    <button
                      key={score}
                      onClick={(e) => handleScoreReview(e, score)}
                      style={{
                        background: score >= 4 ? 'rgba(16, 185, 129, 0.3)' : score >= 3 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#fff',
                        borderRadius: '8px',
                        padding: '8px 0',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'transform 0.15s ease, background 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LearningDashboard;
