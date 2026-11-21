/**
 * SpeakPage (/speak)
 * Page 4: AAC Communication board.
 * Categorized phrases, prominent message preview, Speak, Repeat, and Clear actions.
 */

import React, { useState } from 'react';
import { DwellButton } from '../components/DwellButton';
import { SpeechEngine } from '../speech/SpeechEngine';
import { Volume2, RotateCcw, Delete, MessageSquare, Home } from 'lucide-react';

interface AACCategory {
  id: string;
  name: string;
  phrases: string[];
}

const AAC_CATEGORIES: AACCategory[] = [
  {
    id: 'basic',
    name: 'Basic',
    phrases: ['Yes', 'No', 'Please', 'Thank you', 'Maybe', 'I agree'],
  },
  {
    id: 'needs',
    name: 'Needs',
    phrases: ['I need water', 'I am hungry', 'I need the restroom', 'Please adjust my position', 'I am cold', 'I am hot'],
  },
  {
    id: 'comfort',
    name: 'Comfort',
    phrases: ['I am uncomfortable', 'I am in pain', 'I want to rest', 'I want to sit up', 'I am tired', 'Turn on light'],
  },
  {
    id: 'people',
    name: 'Family & Care',
    phrases: ['Please come here', 'I need help', 'I love you', 'How are you?', 'Call doctor', 'Stay with me'],
  },
  {
    id: 'feelings',
    name: 'Feelings',
    phrases: ['I feel good', 'I feel sad', 'I am happy', 'I am frustrated', 'I am anxious', 'Thank you for caring'],
  },
];

interface SpeakPageProps {
  onNavigateHome?: () => void;
}

export const SpeakPage: React.FC<SpeakPageProps> = ({ onNavigateHome }) => {
  const [activeCategory, setActiveCategory] = useState<string>('basic');
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const speechEngine = SpeechEngine.getInstance();

  const handleSelectPhrase = (phrase: string) => {
    setCurrentMessage(phrase);
    speechEngine.speak(phrase);
  };

  const handleSpeak = () => {
    if (currentMessage) {
      speechEngine.speak(currentMessage);
    }
  };

  const handleRepeat = () => {
    speechEngine.repeat();
  };

  const handleClear = () => {
    setCurrentMessage('');
    speechEngine.stop();
  };

  const currentCategoryObj = AAC_CATEGORIES.find(c => c.id === activeCategory) || AAC_CATEGORIES[0];

  return (
    <div
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '24px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* Top Banner: Message Display & Playback Controls */}
      <section
        style={{
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius-lg)',
          border: '3px solid var(--border)',
          padding: '20px 24px',
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: '20px',
          alignItems: 'center',
          boxShadow: 'var(--shadow-subtle)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
            Selected Message
          </div>
          <div
            style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 700,
              color: currentMessage ? 'var(--text-primary)' : 'var(--text-muted)',
              minHeight: '40px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {currentMessage || 'Select a phrase below...'}
          </div>
        </div>

        {/* Action Buttons: Home, Speak, Repeat, Clear */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {onNavigateHome && (
            <DwellButton
              id="speak-btn-home"
              onClick={onNavigateHome}
              variant="sage"
              size="large"
              ariaLabel="Return to Home screen"
            >
              <Home size={22} />
              <span>Home</span>
            </DwellButton>
          )}

          <DwellButton
            id="speak-btn-speak"
            onClick={handleSpeak}
            disabled={!currentMessage}
            variant="primary"
            size="large"
            ariaLabel="Speak message aloud"
          >
            <Volume2 size={24} />
            <span>Speak</span>
          </DwellButton>

          <DwellButton
            id="speak-btn-repeat"
            onClick={handleRepeat}
            disabled={!currentMessage}
            variant="sage"
            size="large"
            ariaLabel="Repeat last spoken message"
          >
            <RotateCcw size={22} />
            <span>Repeat</span>
          </DwellButton>

          <DwellButton
            id="speak-btn-clear"
            onClick={handleClear}
            disabled={!currentMessage}
            variant="ghost"
            size="large"
            ariaLabel="Clear current message"
          >
            <Delete size={22} />
            <span>Clear</span>
          </DwellButton>
        </div>
      </section>

      {/* Category Tabs */}
      <nav
        style={{
          display: 'flex',
          gap: '10px',
          overflowX: 'auto',
          paddingBottom: '4px',
        }}
        aria-label="Phrase Categories"
      >
        {AAC_CATEGORIES.map((cat) => (
          <DwellButton
            key={cat.id}
            id={`category-tab-${cat.id}`}
            onClick={() => setActiveCategory(cat.id)}
            variant={activeCategory === cat.id ? 'primary' : 'surface'}
            size="normal"
            style={{
              padding: '12px 24px',
              borderRadius: 'var(--radius-full)',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {cat.name}
          </DwellButton>
        ))}
      </nav>

      {/* Phrases Grid: 6 Large, comfortable phrase buttons */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
        }}
        aria-label={`${currentCategoryObj.name} Phrases`}
      >
        {currentCategoryObj.phrases.map((phrase, i) => (
          <DwellButton
            key={phrase}
            id={`phrase-btn-${activeCategory}-${i}`}
            onClick={() => handleSelectPhrase(phrase)}
            variant={currentMessage === phrase ? 'sage' : 'surface'}
            size="card"
            style={{
              minHeight: '120px',
              padding: '20px 24px',
              fontSize: 'var(--font-size-md)',
              fontWeight: 600,
              textAlign: 'center',
              border: currentMessage === phrase ? '3px solid var(--focus)' : '2px solid var(--border)',
            }}
            ariaLabel={`Speak: ${phrase}`}
          >
            {phrase}
          </DwellButton>
        ))}
      </section>
    </div>
  );
};
