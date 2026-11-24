/**
 * HomePage — EyeControl High-Contrast 6-Block Grid
 * Exactly matching the reference UI design (media_1795488976624_2266f9cc.jpg):
 * - Top header bar: EyeControl logo, "Look at a block and hold 0.8 s, or blink", 🟢 Camera on, 🌙 Rest
 * - 3x2 Grid of 6 massive solid-color blocks filling full screen:
 *   1: Speak (Emerald Green #1A6B51) -> Communication board
 *   2: News (Navy Blue #1B3E6D) -> India Today, live feed (opens real indiatoday.in)
 *   3: YouTube (Terracotta Rust #9C3822) -> Videos and channels (opens real youtube.com)
 *   4: Help & Emergency (Wine Crimson #8E243E) -> Guides, tips and SOS
 *   5: Settings (Indigo Violet #43468E) -> Sensitivity and audio
 *   6: Calibrate (Warm Ochre #7D5A12) -> Fine-tune gaze accuracy
 */

import React, { useEffect, useState } from 'react';
import { DwellButton } from '../components/DwellButton';
import { CameraDiagnosticInfo } from '../types/tracking';
import { openAppWindow } from '../utils/windowLauncher';
import { SelectionManager } from '../interaction/SelectionManager';
import { DwellProgressUpdate } from '../interaction/DwellEngine';
import { HomePageGlassmorphic } from './HomePageGlassmorphic';

interface HomePageProps {
  onNavigate: (page: 'home' | 'speak' | 'youtube' | 'news' | 'explore' | 'help' | 'settings' | 'calibration') => void;
  onOpenSettings?: () => void;
  onToggleRest?: () => void;
  diagnosticInfo?: CameraDiagnosticInfo;
  isCalibrated?: boolean;
}

type NavBlock = {
  id: string;
  keyNum: string;
  title: string;
  subtitle: string;
  bg: string;
  icon: React.ReactNode;
  action: () => void;
};

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onOpenSettings,
  onToggleRest,
  diagnosticInfo,
  isCalibrated = false,
}) => {
  const [themeMode, setThemeMode] = useState<'blocks' | 'glassmorphic'>(() => {
    return (localStorage.getItem('eyecontrol_theme') as 'blocks' | 'glassmorphic') || 'blocks';
  });

  const toggleTheme = () => {
    const next = themeMode === 'blocks' ? 'glassmorphic' : 'blocks';
    setThemeMode(next);
    localStorage.setItem('eyecontrol_theme', next);
  };

  const [activeTileId, setActiveTileId] = useState<string>('block-1');
  const [dwellProgress, setDwellProgress] = useState<number>(0);

  // Subscribe to gaze dwell updates
  useEffect(() => {
    const unsub = SelectionManager.getInstance().getDwellEngine().subscribe((update: DwellProgressUpdate) => {
      if (update.targetId && update.targetId.startsWith('block-')) {
        setActiveTileId(update.targetId);
        setDwellProgress(update.progress);
      } else if (!update.targetId) {
        setDwellProgress(0);
      }
    });
    return () => unsub();
  }, []);

  // Keyboard shortcut fallback (1-6)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case '1': onNavigate('speak'); setActiveTileId('block-1'); break;
        case '2': handleOpenIndiaToday(); setActiveTileId('block-2'); break;
        case '3': handleOpenYouTube(); setActiveTileId('block-3'); break;
        case '4': onNavigate('help'); setActiveTileId('block-4'); break;
        case '5': onOpenSettings ? onOpenSettings() : onNavigate('settings'); setActiveTileId('block-5'); break;
        case '6': onNavigate('calibration'); setActiveTileId('block-6'); break;
        case 't': case 'T': toggleTheme(); break;
        case 'r': case 'R': onToggleRest?.(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNavigate, onOpenSettings, onToggleRest, themeMode]);

  if (themeMode === 'glassmorphic') {
    return (
      <HomePageGlassmorphic
        onNavigate={onNavigate}
        onOpenSettings={onOpenSettings}
        onToggleRest={onToggleRest}
        onToggleTheme={toggleTheme}
        diagnosticInfo={diagnosticInfo}
        isCalibrated={isCalibrated}
      />
    );
  }

  const handleOpenYouTube = () => {
    // Open the actual youtube.com website in Google Chrome with the extension active to control YouTube
    openAppWindow('https://www.youtube.com', 'YouTubeWindow');
    window.open('https://www.youtube.com', '_blank');
  };

  const handleOpenIndiaToday = () => {
    // Open the actual indiatoday.in website in Google Chrome with the extension active to control India Today
    openAppWindow('https://www.indiatoday.in', 'IndiaTodayWindow');
    window.open('https://www.indiatoday.in', '_blank');
  };

  const isCameraActive = diagnosticInfo ? (diagnosticInfo.faceDetected || diagnosticInfo.actualFps > 0) : true;

  const BLOCKS: NavBlock[] = [
    {
      id: 'block-1',
      keyNum: '1',
      title: 'Speak',
      subtitle: 'Communication board',
      bg: '#1A6B51',
      icon: (
        <svg width="68" height="68" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      ),
      action: () => onNavigate('speak'),
    },
    {
      id: 'block-2',
      keyNum: '2',
      title: 'News',
      subtitle: 'India Today, live feed',
      bg: '#1B3E6D',
      icon: (
        <svg width="68" height="68" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="4" />
          <line x1="7" y1="8" x2="17" y2="8" />
          <line x1="7" y1="12" x2="17" y2="12" />
          <line x1="7" y1="16" x2="12" y2="16" />
        </svg>
      ),
      action: handleOpenIndiaToday,
    },
    {
      id: 'block-3',
      keyNum: '3',
      title: 'YouTube',
      subtitle: 'Videos and channels',
      bg: '#9C3822',
      icon: (
        <svg width="78" height="56" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="5" />
          <polygon points="10 8 16 12 10 16" fill="none" stroke="#FFFFFF" strokeWidth="2.2" />
        </svg>
      ),
      action: handleOpenYouTube,
    },
    {
      id: 'block-4',
      keyNum: '4',
      title: 'Help &\nEmergency',
      subtitle: 'Guides, tips and SOS',
      bg: '#8E243E',
      icon: (
        <svg width="68" height="68" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="4" />
          <line x1="4.93" y1="4.93" x2="9.17" y2="9.17" />
          <line x1="14.83" y1="14.83" x2="19.07" y2="19.07" />
          <line x1="14.83" y1="9.17" x2="19.07" y2="4.93" />
          <line x1="4.93" y1="19.07" x2="9.17" y2="14.83" />
        </svg>
      ),
      action: () => onNavigate('help'),
    },
    {
      id: 'block-5',
      keyNum: '5',
      title: 'Settings',
      subtitle: 'Sensitivity and audio',
      bg: '#43468E',
      icon: (
        <svg width="68" height="68" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <circle cx="16" cy="6" r="2.8" fill="#43468E" stroke="#FFFFFF" strokeWidth="2.2" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <circle cx="8" cy="12" r="2.8" fill="#43468E" stroke="#FFFFFF" strokeWidth="2.2" />
          <line x1="3" y1="18" x2="21" y2="18" />
          <circle cx="14" cy="18" r="2.8" fill="#43468E" stroke="#FFFFFF" strokeWidth="2.2" />
        </svg>
      ),
      action: () => (onOpenSettings ? onOpenSettings() : onNavigate('settings')),
    },
    {
      id: 'block-6',
      keyNum: '6',
      title: 'Calibrate',
      subtitle: 'Fine-tune gaze accuracy',
      bg: '#7D5A12',
      icon: (
        <svg width="68" height="68" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2">
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" fill="#FFFFFF" />
          <line x1="12" y1="1" x2="12" y2="4" />
          <line x1="12" y1="20" x2="12" y2="23" />
          <line x1="1" y1="12" x2="4" y2="12" />
          <line x1="20" y1="12" x2="23" y2="12" />
        </svg>
      ),
      action: () => onNavigate('calibration'),
    },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000000',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      {/* ============================================================
          TOP HEADER BAR
          - EyeControl Logo + Instruction Subtitle
          - 🟢 Camera on + 🌙 Rest Button
          ============================================================ */}
      <header
        style={{
          height: '56px',
          width: '100%',
          backgroundColor: '#0B0F17',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          boxSizing: 'border-box',
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        {/* Left: EyeControl Brand + Instruction */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Eye Icon SVG */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9.5" stroke="#FFFFFF" strokeWidth="2.4" />
              <circle cx="12" cy="12" r="4.2" fill="#FFFFFF" />
            </svg>
          </div>

          <div
            style={{
              fontSize: '1.45rem',
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '-0.3px',
            }}
          >
            EyeControl
          </div>

          <div
            style={{
              fontSize: '0.92rem',
              color: '#94A3B8',
              fontWeight: 400,
              marginLeft: '12px',
            }}
          >
            Look at a block and hold 0.8 s, or blink
          </div>
        </div>

        {/* Right: Camera Status + Rest Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Camera On Status Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isCameraActive ? '#22C55E' : '#F59E0B',
                boxShadow: isCameraActive ? '0 0 8px #22C55E' : '0 0 8px #F59E0B',
                display: 'inline-block',
              }}
            />
            <span
              style={{
                color: '#CBD5E1',
                fontSize: '0.92rem',
                fontWeight: 500,
              }}
            >
              Camera on
            </span>
          </div>

          {/* Switch to Glassmorphic Dashboard Button */}
          <DwellButton
            id="home-btn-switch-glass"
            onClick={toggleTheme}
            variant="ghost"
            size="normal"
            ariaLabel="Switch to Glassmorphic Dashboard Theme"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '9999px',
              padding: '6px 16px',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.88rem',
              fontWeight: 600,
              minHeight: '38px',
              cursor: 'pointer',
            }}
          >
            <span>✨ Glass Dashboard</span>
          </DwellButton>

          {/* Rest Pill Button */}
          <DwellButton
            id="home-btn-rest-header"
            onClick={() => onToggleRest?.()}
            variant="ghost"
            size="normal"
            ariaLabel="Toggle Rest Mode"
            style={{
              backgroundColor: 'transparent',
              border: '1.6px solid #FFFFFF',
              borderRadius: '9999px',
              padding: '6px 18px',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              minHeight: '38px',
              transition: 'all 120ms ease-out',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
            <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>Rest</span>
          </DwellButton>
        </div>
      </header>

      {/* ============================================================
          MAIN 3×2 GRID OF 6 MASSIVE BLOCKS
          - Fills 100% of remaining screen height
          - 2px dark separation gap
          ============================================================ */}
      <main
        style={{
          flex: 1,
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridTemplateRows: 'repeat(2, 1fr)',
          gap: '3px',
          backgroundColor: '#000000',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {BLOCKS.map((block) => {
          const isFocused = activeTileId === block.id;

          return (
            <DwellButton
              key={block.id}
              id={block.id}
              onClick={block.action}
              variant="surface"
              size="card"
              ariaLabel={`Select ${block.title}`}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '30px 36px',
                height: '100%',
                width: '100%',
                backgroundColor: block.bg,
                border: isFocused ? '3.5px solid #FFFFFF' : 'none',
                boxShadow: isFocused ? 'inset 0 0 32px rgba(255, 255, 255, 0.35), 0 0 24px rgba(255, 255, 255, 0.4)' : 'none',
                filter: isFocused ? 'brightness(1.10)' : 'none',
                cursor: 'pointer',
                boxSizing: 'border-box',
                borderRadius: 0,
                transition: 'filter 120ms ease-out, border 120ms ease-out',
                overflow: 'hidden',
                textAlign: 'left',
              }}
            >
              {/* TOP ROW: Number Badge (Left) + Big Line-Art Icon (Right) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  width: '100%',
                }}
              >
                {/* Number Badge in rounded square outline */}
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    border: '2px solid rgba(255, 255, 255, 0.85)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '1.15rem',
                  }}
                >
                  {block.keyNum}
                </div>

                {/* Big White Icon */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.95,
                  }}
                >
                  {block.icon}
                </div>
              </div>

              {/* BOTTOM ROW: Huge Bold Title + Clean Subtitle */}
              <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto' }}>
                <h1
                  style={{
                    fontSize: block.id === 'block-4' ? 'clamp(2.1rem, 3.2vw, 3.3rem)' : 'clamp(2.6rem, 4vw, 4rem)',
                    fontWeight: 800,
                    color: '#FFFFFF',
                    lineHeight: 1.08,
                    margin: 0,
                    letterSpacing: '-0.5px',
                    whiteSpace: 'pre-line',
                  }}
                >
                  {block.title}
                </h1>

                <p
                  style={{
                    fontSize: 'clamp(1rem, 1.4vw, 1.35rem)',
                    color: 'rgba(255, 255, 255, 0.88)',
                    fontWeight: 500,
                    margin: 0,
                    marginTop: '8px',
                    letterSpacing: '0.1px',
                  }}
                >
                  {block.subtitle}
                </p>
              </div>

              {/* Dwell Progress Indicator Stripe at bottom of focused tile */}
              {isFocused && dwellProgress > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    height: '8px',
                    width: `${dwellProgress * 100}%`,
                    backgroundColor: '#FFFFFF',
                    boxShadow: '0 0 12px #FFFFFF',
                    transition: 'width 60ms linear',
                  }}
                />
              )}
            </DwellButton>
          );
        })}
      </main>
    </div>
  );
};
