/**
 * SpeakPage (/speak)
 * AAC Hands-Free Communication Board
 * - Categorized vocabulary: Basic Needs, Food & Water, Pain, Emotions, Family, Yes/No, Help
 * - Sentence Builder buffer: Select words/phrases to build complete sentences
 * - Speech synthesis controls: Speak, Repeat, Backspace, Clear
 * - Blue Gaze Selection Rings on cards for effortless dwell selection
 */

import React, { useState } from 'react';
import { DwellButton } from '../components/DwellButton';
import { SpeechEngine } from '../speech/SpeechEngine';
import {
  Volume2,
  RotateCcw,
  Delete,
  MessageSquare,
  Home,
  Check,
  X,
  AlertTriangle,
  Heart,
  Utensils,
  Plus,
} from 'lucide-react';

interface AACCategory {
  id: string;
  name: string;
  icon?: string;
  phrases: string[];
}

const AAC_CATEGORIES: AACCategory[] = [
  {
    id: 'basic',
    name: 'Basic Needs',
    phrases: ['Yes', 'No', 'Please', 'Thank you', 'Maybe', 'I need help', 'I am thirsty', 'I need water'],
  },
  {
    id: 'food_water',
    name: 'Food & Water',
    phrases: ['I am hungry', 'I want water', 'I want tea or coffee', 'Please cut food smaller', 'I am finished', 'Tastes good'],
  },
  {
    id: 'comfort_pain',
    name: 'Pain & Comfort',
    phrases: ['I am in pain', 'My head hurts', 'My back hurts', 'Please adjust my position', 'I am too cold', 'I am too hot', 'I want to sit up', 'I want to rest'],
  },
  {
    id: 'emotions',
    name: 'Emotions',
    phrases: ['I feel happy', 'I feel sad', 'I feel tired', 'I am frustrated', 'I love you', 'Thank you for your patience', 'I am comfortable'],
  },
  {
    id: 'family_care',
    name: 'Family & Care',
    phrases: ['Call caregiver', 'Call doctor', 'Please stay with me', 'How are you?', 'Can you adjust my screen?', 'Please open window', 'Turn on light'],
  },
];

interface SpeakPageProps {
  onNavigateHome?: () => void;
}

export const SpeakPage: React.FC<SpeakPageProps> = ({ onNavigateHome }) => {
  const [activeCategory, setActiveCategory] = useState<string>('basic');
  const [sentenceBuffer, setSentenceBuffer] = useState<string[]>([]);
  const speechEngine = SpeechEngine.getInstance();

  const handleAppendPhrase = (phrase: string) => {
    const updated = [...sentenceBuffer, phrase];
    setSentenceBuffer(updated);
    // Instant audio feedback of the selected word
    speechEngine.speak(phrase);
  };

  const handleSpeakFullSentence = () => {
    if (sentenceBuffer.length > 0) {
      const fullText = sentenceBuffer.join(' ');
      speechEngine.speak(fullText);
    }
  };

  const handleRepeat = () => {
    speechEngine.repeat();
  };

  const handleBackspace = () => {
    if (sentenceBuffer.length > 0) {
      setSentenceBuffer(sentenceBuffer.slice(0, -1));
    }
  };

  const handleClear = () => {
    setSentenceBuffer([]);
    speechEngine.stop();
  };

  const currentCategoryObj = AAC_CATEGORIES.find((c) => c.id === activeCategory) || AAC_CATEGORIES[0];
  const fullSentenceText = sentenceBuffer.join(' ');

  return (
    <div
      style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: '20px 28px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        height: 'calc(100vh - 90px)',
      }}
    >
      {/* Top Banner: Sentence Builder & Playback Controls */}
      <section
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-lg)',
          border: '2px solid var(--border)',
          padding: '16px 24px',
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: '20px',
          alignItems: 'center',
          boxShadow: 'var(--shadow-card)',
        }}
        aria-label="Sentence Builder"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
            Sentence Builder (Select phrases below to construct your message)
          </div>
          <div
            style={{
              fontSize: '1.4rem',
              fontWeight: 700,
              color: fullSentenceText ? 'var(--text-primary)' : 'var(--text-muted)',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#F8FAFC',
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--border)',
            }}
          >
            {fullSentenceText || 'Sentence will appear here...'}
          </div>
        </div>

        {/* Action Buttons: Speak, Repeat, Backspace, Clear, Home */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {onNavigateHome && (
            <DwellButton
              id="speak-btn-home"
              onClick={onNavigateHome}
              variant="sage"
              size="normal"
              ariaLabel="Return to Home Dashboard"
              style={{ minHeight: '52px', padding: '10px 18px' }}
            >
              <Home size={20} />
              <span>Home</span>
            </DwellButton>
          )}

          <DwellButton
            id="speak-btn-speak"
            onClick={handleSpeakFullSentence}
            disabled={sentenceBuffer.length === 0}
            variant="primary"
            size="normal"
            ariaLabel="Speak entire sentence aloud"
            style={{ minHeight: '52px', padding: '10px 22px', fontWeight: 800 }}
          >
            <Volume2 size={22} />
            <span>Speak All</span>
          </DwellButton>

          <DwellButton
            id="speak-btn-repeat"
            onClick={handleRepeat}
            disabled={sentenceBuffer.length === 0}
            variant="surface"
            size="normal"
            ariaLabel="Repeat speech"
            style={{ minHeight: '52px', padding: '10px 16px' }}
          >
            <RotateCcw size={18} />
            <span>Repeat</span>
          </DwellButton>

          <DwellButton
            id="speak-btn-backspace"
            onClick={handleBackspace}
            disabled={sentenceBuffer.length === 0}
            variant="ghost"
            size="normal"
            ariaLabel="Remove last word"
            style={{ minHeight: '52px', padding: '10px 16px' }}
          >
            <Delete size={18} />
            <span>Backspace</span>
          </DwellButton>

          <DwellButton
            id="speak-btn-clear"
            onClick={handleClear}
            disabled={sentenceBuffer.length === 0}
            variant="ghost"
            size="normal"
            ariaLabel="Clear entire message"
            style={{ minHeight: '52px', padding: '10px 16px' }}
          >
            <span>Clear</span>
          </DwellButton>
        </div>
      </section>

      {/* Main AAC Area: Left Category Selector + Right Phrase Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '20px', flex: 1, overflow: 'hidden' }}>
        {/* Category Selector */}
        <nav
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-lg)',
            border: '2px solid var(--border)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            boxShadow: 'var(--shadow-card)',
          }}
          aria-label="Communication Categories"
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
            Categories
          </div>
          {AAC_CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat.id;
            return (
              <DwellButton
                key={cat.id}
                id={`speak-cat-${cat.id}`}
                onClick={() => setActiveCategory(cat.id)}
                variant={isSelected ? 'primary' : 'surface'}
                size="normal"
                ariaLabel={`Select ${cat.name}`}
                style={{
                  justifyContent: 'flex-start',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                }}
              >
                <span>{cat.name}</span>
              </DwellButton>
            );
          })}
        </nav>

        {/* Phrases Grid: 8 Large Cards with Blue Selection Rings */}
        <section
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-lg)',
            border: '2px solid var(--border)',
            padding: '24px',
            boxShadow: 'var(--shadow-card)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '18px',
            alignContent: 'start',
            overflowY: 'auto',
          }}
          aria-label="Phrases Grid"
        >
          {currentCategoryObj.phrases.map((phrase, i) => (
            <DwellButton
              key={phrase}
              id={`phrase-btn-${activeCategory}-${i}`}
              onClick={() => handleAppendPhrase(phrase)}
              variant="surface"
              size="card"
              showCenterRing={true}
              ariaLabel={`Add phrase: ${phrase}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '24px 18px',
                minHeight: '140px',
                textAlign: 'center',
                backgroundColor: '#F8FAFC',
                border: '2px solid var(--border)',
              }}
            >
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                {phrase}
              </span>
            </DwellButton>
          ))}
        </section>
      </div>
    </div>
  );
};
