/**
 * HomePage (/home)
 * Design 1: Modern Dashboard (Recommended)
 * Exactly matching the reference assistive layout:
 * - Left "Quick Access" sidebar (Home, Speak, YouTube, News, Settings)
 * - Center Grid of 6 large high-contrast cards (News, YouTube, Speak, Settings, Communication, Learning)
 * - Right live "India Today • Latest News" preview with image, headline, and Read Aloud / Stop Scroll controls
 * - Bottom instruction pill: "Gaze at any option to select it. A blue ring will show your selection."
 * - Rest mode shortcut
 */

import React, { useState } from 'react';
import { DwellButton } from '../components/DwellButton';
import { SpeechEngine } from '../speech/SpeechEngine';
import {
  Newspaper,
  Youtube,
  Volume2,
  Settings,
  Heart,
  GraduationCap,
  Play,
  Square,
  Home,
  ArrowRight,
  CheckCircle2,
  Moon,
  Maximize2,
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (page: 'home' | 'speak' | 'youtube' | 'news' | 'explore' | 'help' | 'settings' | 'calibration') => void;
  onOpenSettings?: () => void;
  onToggleRest?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onOpenSettings,
  onToggleRest,
}) => {
  const [isReadingSummary, setIsReadingSummary] = useState(false);
  const speechEngine = SpeechEngine.getInstance();

  const previewHeadline = {
    title: "India's growth story on track, says PM Modi",
    summary:
      "India is on a steady growth path despite global uncertainties, says the Prime Minister, highlighting domestic innovation, green energy transitions, and digital infrastructure.",
    source: "India Today • Latest News",
    imageUrl: "https://images.unsplash.com/photo-1532375810709-75b1da00537c?auto=format&fit=crop&w=600&q=80",
  };

  const handleReadSummary = () => {
    if (isReadingSummary) {
      speechEngine.stop();
      setIsReadingSummary(false);
      return;
    }

    setIsReadingSummary(true);
    speechEngine.speak(
      `${previewHeadline.source}. ${previewHeadline.title}. ${previewHeadline.summary}`,
      () => {
        setIsReadingSummary(false);
      }
    );
  };

  const handleStopSummary = () => {
    speechEngine.stop();
    setIsReadingSummary(false);
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <main
      style={{
        flex: 1,
        maxWidth: '1440px',
        margin: '0 auto',
        width: '100%',
        padding: '24px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* 3-Column Main Dashboard Layout matching Design 1 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '220px 1fr 380px',
          gap: '24px',
          alignItems: 'stretch',
          minHeight: '520px',
        }}
      >
        {/* ========================================================================= */}
        {/* COLUMN 1: LEFT SIDEBAR "QUICK ACCESS"                                    */}
        {/* ========================================================================= */}
        <nav
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-lg)',
            border: '2px solid var(--border)',
            padding: '20px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: 'var(--shadow-card)',
          }}
          aria-label="Quick Access Navigation"
        >
          <div
            style={{
              fontSize: '0.85rem',
              fontWeight: 800,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              paddingLeft: '8px',
              marginBottom: '4px',
            }}
          >
            Quick Access
          </div>

          <DwellButton
            id="nav-quick-home"
            onClick={() => onNavigate('home')}
            variant="primary"
            size="normal"
            ariaLabel="Home Dashboard"
            style={{ justifyContent: 'flex-start', padding: '12px 18px', gap: '14px' }}
          >
            <Home size={22} />
            <span style={{ fontWeight: 700 }}>Home</span>
          </DwellButton>

          <DwellButton
            id="nav-quick-speak"
            onClick={() => onNavigate('speak')}
            variant="surface"
            size="normal"
            ariaLabel="Speak Voice Assistant"
            style={{ justifyContent: 'flex-start', padding: '12px 18px', gap: '14px' }}
          >
            <Volume2 size={22} color="var(--secondary)" />
            <span>Speak</span>
          </DwellButton>

          <DwellButton
            id="nav-quick-youtube"
            onClick={() => onNavigate('youtube')}
            variant="surface"
            size="normal"
            ariaLabel="YouTube Video Player"
            style={{ justifyContent: 'flex-start', padding: '12px 18px', gap: '14px' }}
          >
            <Youtube size={22} color="#DC2626" />
            <span>YouTube</span>
          </DwellButton>

          <DwellButton
            id="nav-quick-news"
            onClick={() => onNavigate('news')}
            variant="surface"
            size="normal"
            ariaLabel="India Today News Reader"
            style={{ justifyContent: 'flex-start', padding: '12px 18px', gap: '14px' }}
          >
            <Newspaper size={22} color="#2563EB" />
            <span>News</span>
          </DwellButton>

          <DwellButton
            id="nav-quick-settings"
            onClick={() => (onOpenSettings ? onOpenSettings() : onNavigate('settings'))}
            variant="ghost"
            size="normal"
            ariaLabel="Accessibility Settings"
            style={{ justifyContent: 'flex-start', padding: '12px 18px', gap: '14px', marginTop: 'auto' }}
          >
            <Settings size={22} color="var(--text-secondary)" />
            <span>Settings</span>
          </DwellButton>
        </nav>

        {/* ========================================================================= */}
        {/* COLUMN 2: CENTER GRID OF 6 LARGE CARDS                                    */}
        {/* ========================================================================= */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridTemplateRows: 'repeat(2, 1fr)',
            gap: '18px',
          }}
        >
          {/* Card 1: News (Design 1 Hero item with Blue Ring) */}
          <DwellButton
            id="home-card-news"
            onClick={() => onNavigate('news')}
            variant="surface"
            size="card"
            showCenterRing={true}
            ariaLabel="News: Read today's news from India Today"
            style={{
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '24px 16px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563EB',
                marginBottom: '14px',
              }}
            >
              <Newspaper size={36} />
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              News
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Read today's news
            </div>
          </DwellButton>

          {/* Card 2: YouTube */}
          <DwellButton
            id="home-card-youtube"
            onClick={() => onNavigate('youtube')}
            variant="surface"
            size="card"
            showCenterRing={true}
            ariaLabel="YouTube: Watch videos"
            style={{
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '24px 16px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: '#FEF2F2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#DC2626',
                marginBottom: '14px',
              }}
            >
              <Youtube size={36} />
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              YouTube
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Watch videos
            </div>
          </DwellButton>

          {/* Card 3: Speak */}
          <DwellButton
            id="home-card-speak"
            onClick={() => onNavigate('speak')}
            variant="surface"
            size="card"
            showCenterRing={true}
            ariaLabel="Speak: Voice assistant & communication board"
            style={{
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '24px 16px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: '#F0FDF4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#16A34A',
                marginBottom: '14px',
              }}
            >
              <Volume2 size={36} />
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Speak
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Voice assistant
            </div>
          </DwellButton>

          {/* Card 4: Settings */}
          <DwellButton
            id="home-card-settings"
            onClick={() => (onOpenSettings ? onOpenSettings() : onNavigate('settings'))}
            variant="surface"
            size="card"
            showCenterRing={true}
            ariaLabel="Settings: Customize gaze sensitivity and preferences"
            style={{
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '24px 16px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: '#F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#475569',
                marginBottom: '14px',
              }}
            >
              <Settings size={36} />
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Settings
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Customize
            </div>
          </DwellButton>

          {/* Card 5: Communication */}
          <DwellButton
            id="home-card-communication"
            onClick={() => onNavigate('speak')}
            variant="surface"
            size="card"
            showCenterRing={true}
            ariaLabel="Communication: Let's talk"
            style={{
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '24px 16px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: '#FDF2F8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#DB2777',
                marginBottom: '14px',
              }}
            >
              <Heart size={36} />
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Communication
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Let's talk
            </div>
          </DwellButton>

          {/* Card 6: Learning & Help */}
          <DwellButton
            id="home-card-learning"
            onClick={() => onNavigate('help')}
            variant="surface"
            size="card"
            showCenterRing={true}
            ariaLabel="Learning: Explore & Learn"
            style={{
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '24px 16px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: '#FAF5FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9333EA',
                marginBottom: '14px',
              }}
            >
              <GraduationCap size={36} />
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Learning
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Explore & Learn
            </div>
          </DwellButton>
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 3: RIGHT "INDIA TODAY • LATEST NEWS" PREVIEW CARD                 */}
        {/* ========================================================================= */}
        <section
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-lg)',
            border: '2px solid var(--border)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow-card)',
            gap: '14px',
          }}
          aria-label="Today's News Preview"
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#DC2626', textTransform: 'uppercase' }}>
              {previewHeadline.source}
            </span>
            <DwellButton
              id="home-btn-view-more-news"
              onClick={() => onNavigate('news')}
              variant="ghost"
              size="normal"
              ariaLabel="View more India Today headlines"
              style={{ minHeight: '36px', padding: '6px 10px', fontSize: '0.85rem', color: 'var(--secondary)' }}
            >
              <span>View More</span>
              <ArrowRight size={14} />
            </DwellButton>
          </div>

          {/* Hero Thumbnail */}
          <div
            style={{
              width: '100%',
              height: '160px',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              backgroundColor: '#0F172A',
              position: 'relative',
            }}
          >
            <img
              src={previewHeadline.imageUrl}
              alt="India Today Headline Thumbnail"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          {/* Headline & Body */}
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px 0', lineHeight: 1.3 }}>
              {previewHeadline.title}
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
              {previewHeadline.summary}
            </p>
          </div>

          {/* Audio Reading Controls */}
          <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
            <DwellButton
              id="home-btn-news-read"
              onClick={handleReadSummary}
              variant={isReadingSummary ? 'primary' : 'sage'}
              size="normal"
              ariaLabel={isReadingSummary ? 'Stop reading summary' : 'Read headline summary aloud'}
              style={{ flex: 1, minHeight: '48px', padding: '10px 14px', fontSize: '0.95rem' }}
            >
              <Play size={18} />
              <span>{isReadingSummary ? 'Reading...' : 'Read Aloud'}</span>
            </DwellButton>

            <DwellButton
              id="home-btn-news-stop"
              onClick={handleStopSummary}
              disabled={!isReadingSummary}
              variant="ghost"
              size="normal"
              ariaLabel="Stop reading news aloud"
              style={{ minHeight: '48px', padding: '10px 14px', fontSize: '0.95rem' }}
            >
              <Square size={16} />
              <span>Stop</span>
            </DwellButton>
          </div>
        </section>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM BAR: INSTRUCTION PILL + REST MODE + FULLSCREEN                     */}
      {/* ========================================================================= */}
      <footer
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        {/* Instruction Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: '#F0FDF4',
            border: '1.5px solid #BBF7D0',
            padding: '10px 20px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.95rem',
            color: '#166534',
            fontWeight: 600,
            boxShadow: 'var(--shadow-subtle)',
          }}
        >
          <CheckCircle2 size={18} color="#16A34A" />
          <span>Gaze at any option to select it. A blue ring will show your selection.</span>
        </div>

        {/* Bottom Right Controls: Rest Mode + Fullscreen */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {onToggleRest && (
            <DwellButton
              id="home-btn-bottom-rest"
              onClick={onToggleRest}
              variant="surface"
              size="normal"
              ariaLabel="Pause and enter Rest Mode"
              style={{ minHeight: '44px', padding: '8px 16px', fontSize: '0.9rem' }}
            >
              <Moon size={16} />
              <span>Rest Mode</span>
            </DwellButton>
          )}

          <DwellButton
            id="home-btn-fullscreen"
            onClick={handleToggleFullscreen}
            variant="ghost"
            size="normal"
            ariaLabel="Toggle Fullscreen"
            style={{ minHeight: '44px', padding: '8px 12px' }}
          >
            <Maximize2 size={18} />
          </DwellButton>
        </div>
      </footer>
    </main>
  );
};
