/**
 * HomePage (/home)
 * Page 3: Primary daily dashboard.
 * Exactly three prominent action cards: Speak, Read & Watch, Help.
 */

import React from 'react';
import { DwellButton } from '../components/DwellButton';
import { MessageSquare, BookOpen, AlertOctagon, HeartHandshake } from 'lucide-react';

interface HomePageProps {
  onNavigate: (page: 'speak' | 'explore' | 'help') => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  return (
    <main
      style={{
        flex: 1,
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
        padding: '36px 28px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: '32px',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 'var(--font-size-xl)', color: 'var(--text-primary)', fontWeight: 700 }}>
          What would you like to do?
        </h1>
        <p style={{ fontSize: 'var(--font-size-md)', color: 'var(--text-secondary)', marginTop: '6px' }}>
          Rest your gaze on any card to open it.
        </p>
      </div>

      {/* Exactly Three Prominent Action Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '28px',
          alignItems: 'stretch',
        }}
      >
        {/* Card 1: Speak */}
        <DwellButton
          id="home-card-speak"
          onClick={() => onNavigate('speak')}
          variant="surface"
          size="card"
          ariaLabel="Speak: Communicate with words and phrases"
          style={{
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            padding: '36px 30px',
            backgroundColor: 'var(--surface)',
            border: '3px solid var(--border)',
            minHeight: '280px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--surface-sage)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
            }}
          >
            <MessageSquare size={36} />
          </div>

          <div style={{ marginTop: 'auto', textAlign: 'left' }}>
            <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--text-primary)', fontWeight: 700 }}>
              Speak
            </h2>
            <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--text-secondary)', marginTop: '6px', fontWeight: 400 }}>
              Communicate phrases, needs and feelings aloud.
            </p>
          </div>
        </DwellButton>

        {/* Card 2: Read & Watch */}
        <DwellButton
          id="home-card-explore"
          onClick={() => onNavigate('explore')}
          variant="surface"
          size="card"
          ariaLabel="Read and Watch: News, articles, and videos"
          style={{
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            padding: '36px 30px',
            backgroundColor: 'var(--surface)',
            border: '3px solid var(--border)',
            minHeight: '280px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--surface-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#345E6A',
            }}
          >
            <BookOpen size={36} />
          </div>

          <div style={{ marginTop: 'auto', textAlign: 'left' }}>
            <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--text-primary)', fontWeight: 700 }}>
              Read & Watch
            </h2>
            <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--text-secondary)', marginTop: '6px', fontWeight: 400 }}>
              Listen to news articles and watch curated videos.
            </p>
          </div>
        </DwellButton>

        {/* Card 3: Help */}
        <DwellButton
          id="home-card-help"
          onClick={() => onNavigate('help')}
          variant="emergency"
          size="card"
          ariaLabel="Help: Contact someone or speak emergency alert"
          style={{
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            padding: '36px 30px',
            backgroundColor: 'var(--emergency-surface)',
            border: '3px solid var(--emergency-border)',
            minHeight: '280px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#E8C7C0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--emergency)',
            }}
          >
            <AlertOctagon size={36} />
          </div>

          <div style={{ marginTop: 'auto', textAlign: 'left' }}>
            <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--emergency)', fontWeight: 700 }}>
              Help
            </h2>
            <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--text-secondary)', marginTop: '6px', fontWeight: 400 }}>
              Call caregiver or broadcast an urgent assistance message.
            </p>
          </div>
        </DwellButton>
      </div>
    </main>
  );
};
