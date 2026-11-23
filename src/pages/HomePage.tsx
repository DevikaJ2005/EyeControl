/**
 * HomePage — EyeControl Modern Glassmorphic Dashboard
 * Exactly matching the reference UI design:
 * - Misty blue mountain twilight landscape backdrop with deep glassmorphism
 * - 4x2 Grid of 8 glass tiles (Home, YouTube, News, Speak, Help, Settings, Calibrate, Rest Mode)
 * - Neon Electric-Blue Selection Ring (#00C8FF) with radial glow around active/focused icons
 * - "Today's News" card on the right with rocket launch imagery & headline
 * - Slim top header bar with EyeControl logo, live clock, and tracking status
 * - Bottom translucent capsule: "Look at an option and wait for selection"
 */

import React, { useEffect, useState } from 'react';
import { DwellButton } from '../components/DwellButton';
import { CameraDiagnosticInfo } from '../types/tracking';
import { openAppWindow } from '../utils/windowLauncher';
import { SelectionManager } from '../interaction/SelectionManager';
import { DwellProgressUpdate } from '../interaction/DwellEngine';
import {
  Home,
  Newspaper,
  MessageSquare,
  LifeBuoy,
  Settings,
  Target,
  Bed,
  Calendar,
  Info,
  ArrowRight,
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (page: 'home' | 'speak' | 'youtube' | 'news' | 'explore' | 'help' | 'settings' | 'calibration') => void;
  onOpenSettings?: () => void;
  onToggleRest?: () => void;
  diagnosticInfo?: CameraDiagnosticInfo;
  isCalibrated?: boolean;
}

type NavTile = {
  id: string;
  label: string;
  icon: React.ReactNode;
  page: 'home' | 'youtube' | 'news' | 'speak' | 'help' | 'settings' | 'calibration' | 'rest';
  keyNum: string;
  customIcon?: boolean;
};

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onOpenSettings,
  onToggleRest,
  diagnosticInfo,
  isCalibrated = false,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('10:24 AM');
  const [activeTileId, setActiveTileId] = useState<string>('tile-home');
  const [dwellProgress, setDwellProgress] = useState<number>(0);

  // Subscribe to gaze dwell progress and active target tracking
  useEffect(() => {
    const unsub = SelectionManager.getInstance().getDwellEngine().subscribe((update: DwellProgressUpdate) => {
      if (update.targetId && update.targetId.startsWith('tile-')) {
        setActiveTileId(update.targetId);
        setDwellProgress(update.progress);
      } else if (!update.targetId) {
        setDwellProgress(0);
      }
    });
    return () => unsub();
  }, []);

  // Live Clock Update
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard shortcut fallback (1-8)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case '1': onNavigate('home'); setActiveTileId('tile-home'); break;
        case '2': onNavigate('youtube'); setActiveTileId('tile-youtube'); break;
        case '3': onNavigate('news'); setActiveTileId('tile-news'); break;
        case '4': onNavigate('speak'); setActiveTileId('tile-speak'); break;
        case '5': onNavigate('help'); setActiveTileId('tile-help'); break;
        case '6': onOpenSettings ? onOpenSettings() : onNavigate('settings'); setActiveTileId('tile-settings'); break;
        case '7': onNavigate('calibration'); setActiveTileId('tile-calibrate'); break;
        case '8': onToggleRest?.(); setActiveTileId('tile-rest'); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNavigate, onOpenSettings, onToggleRest]);

  // 8 Grid Tiles exactly matching reference mockup
  const NAV_TILES: NavTile[] = [
    {
      id: 'tile-home',
      label: 'Home',
      icon: <Home size={34} color="#FFFFFF" strokeWidth={2.2} />,
      page: 'home',
      keyNum: '1',
    },
    {
      id: 'tile-youtube',
      label: 'YouTube',
      icon: (
        <div
          style={{
            width: '54px',
            height: '36px',
            backgroundColor: '#FF0000',
            borderRadius: '11px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(255, 0, 0, 0.4)',
          }}
        >
          {/* YouTube Play Triangle */}
          <div
            style={{
              width: 0,
              height: 0,
              borderTop: '7px solid transparent',
              borderBottom: '7px solid transparent',
              borderLeft: '14px solid #FFFFFF',
              marginLeft: '3px',
            }}
          />
        </div>
      ),
      page: 'youtube',
      keyNum: '2',
      customIcon: true,
    },
    {
      id: 'tile-news',
      label: 'News',
      icon: <Newspaper size={34} color="#FFFFFF" strokeWidth={2.2} />,
      page: 'news',
      keyNum: '3',
    },
    {
      id: 'tile-speak',
      label: 'Speak',
      icon: <MessageSquare size={34} color="#FFFFFF" strokeWidth={2.2} />,
      page: 'speak',
      keyNum: '4',
    },
    {
      id: 'tile-help',
      label: 'Help',
      icon: <LifeBuoy size={34} color="#FFFFFF" strokeWidth={2.2} />,
      page: 'help',
      keyNum: '5',
    },
    {
      id: 'tile-settings',
      label: 'Settings',
      icon: <Settings size={34} color="#FFFFFF" strokeWidth={2.2} />,
      page: 'settings',
      keyNum: '6',
    },
    {
      id: 'tile-calibrate',
      label: 'Calibrate',
      icon: <Target size={34} color="#FFFFFF" strokeWidth={2.2} />,
      page: 'calibration',
      keyNum: '7',
    },
    {
      id: 'tile-rest',
      label: 'Rest Mode',
      icon: <Bed size={34} color="#FFFFFF" strokeWidth={2.2} />,
      page: 'rest',
      keyNum: '8',
    },
  ];

  const handleTileClick = (tile: NavTile) => {
    setActiveTileId(tile.id);
    if (tile.page === 'settings' && onOpenSettings) {
      onOpenSettings();
    } else if (tile.page === 'rest') {
      onToggleRest?.();
    } else if (tile.page === 'youtube') {
      openAppWindow('https://www.youtube.com', 'YouTubeWindow');
      onNavigate('youtube');
    } else {
      onNavigate(tile.page as Parameters<typeof onNavigate>[0]);
    }
  };

  const isTrackingActive = diagnosticInfo ? diagnosticInfo.faceDetected : true;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        backgroundImage: `linear-gradient(180deg, rgba(6, 16, 26, 0.45) 0%, rgba(4, 12, 20, 0.65) 100%), url('/images/misty_mountains.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      {/* Floating Glassmorphic Main Window Card matching reference screenshot */}
      <div
        style={{
          width: '100%',
          maxWidth: '1380px',
          height: '100%',
          maxHeight: '880px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: 'rgba(11, 25, 40, 0.82)',
          border: '1.2px solid rgba(255, 255, 255, 0.14)',
          borderRadius: '26px',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.16)',
          padding: '26px 36px',
          boxSizing: 'border-box',
        }}
      >
        {/* ============================================================
            TOP HEADER BAR
            - Logo: Glowing Eye + "EyeControl" + "Look • Select • Speak"
            - Right: 🟢 Tracking Active | 📅 10:24 AM ⚙️
            ============================================================ */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            flexShrink: 0,
          }}
        >
          {/* Left: EyeControl Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Eye Icon SVG matching reference */}
            <div
              style={{
                width: '46px',
                height: '46px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                filter: 'drop-shadow(0 0 10px rgba(0, 200, 255, 0.75))',
              }}
            >
              <svg width="46" height="46" viewBox="0 0 48 48" fill="none">
                <path
                  d="M24 11C13.2 11 4.2 18.5 1.5 24C4.2 29.5 13.2 37 24 37C34.8 37 43.8 29.5 46.5 24C43.8 18.5 34.8 11 24 11Z"
                  stroke="#00C8FF"
                  strokeWidth="3.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="24" cy="24" r="7.5" stroke="#00C8FF" strokeWidth="3" />
                <circle cx="24" cy="24" r="3.2" fill="#00C8FF" />
              </svg>
            </div>

            <div>
              <div
                style={{
                  fontSize: '1.7rem',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  lineHeight: 1.1,
                  letterSpacing: '-0.3px',
                }}
              >
                EyeControl
              </div>
              <div
                style={{
                  fontSize: '0.82rem',
                  color: '#7DD3FC',
                  fontWeight: 500,
                  letterSpacing: '0.4px',
                  marginTop: '2px',
                }}
              >
                Look • Select • Speak
              </div>
            </div>
          </div>

          {/* Right: Status + Live Clock + Settings */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            {/* Tracking Active Status Pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                padding: '6px 14px',
                borderRadius: '9999px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <span
                style={{
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  backgroundColor: isTrackingActive ? '#10B981' : '#F59E0B',
                  boxShadow: isTrackingActive ? '0 0 10px #10B981' : '0 0 10px #F59E0B',
                  display: 'inline-block',
                }}
              />
              <span
                style={{
                  color: '#E2E8F0',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                }}
              >
                {isTrackingActive ? 'Tracking Active' : 'Face Not Detected'}
              </span>
            </div>

            {/* Vertical Divider */}
            <div
              style={{
                width: '1px',
                height: '20px',
                backgroundColor: 'rgba(255, 255, 255, 0.22)',
              }}
            />

            {/* Calendar & Time */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#CBD5E1',
                fontSize: '0.9rem',
                fontWeight: 500,
              }}
            >
              <Calendar size={16} color="#94A3B8" />
              <span>{currentTime}</span>
            </div>

            {/* Settings Gear Button */}
            <DwellButton
              id="home-btn-settings-gear"
              onClick={() => (onOpenSettings ? onOpenSettings() : onNavigate('settings'))}
              variant="ghost"
              size="normal"
              ariaLabel="Open system settings"
              style={{
                minHeight: '38px',
                width: '38px',
                padding: 0,
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                color: '#94A3B8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Settings size={18} />
            </DwellButton>
          </div>
        </header>

      {/* ============================================================
          MAIN CONTENT AREA
          - Left: 4×2 Grid of 8 Frosted Glass Tiles
          - Right: "Today's News" Card with rocket launch imagery
          ============================================================ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 310px',
          gap: '24px',
          flex: 1,
          minHeight: 0,
          margin: '20px 0',
        }}
      >
        {/* ===========================
            LEFT: 4×2 Grid of 8 Tiles
            =========================== */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gridTemplateRows: 'repeat(2, 1fr)',
            gap: '16px',
            height: '100%',
          }}
        >
          {NAV_TILES.map((tile) => {
            const isCurrentlySelected = activeTileId === tile.id;

            return (
              <DwellButton
                key={tile.id}
                id={tile.id}
                onClick={() => handleTileClick(tile)}
                variant="surface"
                size="card"
                ariaLabel={`Select ${tile.label}`}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  padding: '20px',
                  height: '100%',
                  borderRadius: '18px',
                  backgroundColor: isCurrentlySelected
                    ? 'rgba(0, 163, 255, 0.12)'
                    : 'rgba(18, 38, 58, 0.55)',
                  border: isCurrentlySelected
                    ? '1.8px solid rgba(0, 200, 255, 0.85)'
                    : '1px solid rgba(255, 255, 255, 0.12)',
                  backdropFilter: 'blur(16px)',
                  boxShadow: isCurrentlySelected
                    ? '0 0 28px rgba(0, 200, 255, 0.45), 0 8px 32px rgba(0, 0, 0, 0.35)'
                    : '0 8px 24px rgba(0, 0, 0, 0.28)',
                  transition: 'all 140ms ease-out',
                  cursor: 'pointer',
                  overflow: 'visible',
                }}
              >
                {/* ICON CONTAINER: Active state has glowing neon circular ring */}
                <div
                  style={{
                    position: 'relative',
                    width: '84px',
                    height: '84px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {/* Neon Cyan Gaze Selection Ring on active tile */}
                  {isCurrentlySelected && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: '-4px',
                        borderRadius: '50%',
                        border: '3.5px solid #00C8FF',
                        backgroundColor: 'rgba(0, 200, 255, 0.14)',
                        boxShadow: '0 0 24px rgba(0, 200, 255, 0.9), inset 0 0 14px rgba(0, 200, 255, 0.4)',
                        pointerEvents: 'none',
                        transition: 'all 120ms ease-out',
                      }}
                    />
                  )}

                  {/* Tile Icon */}
                  <div
                    style={{
                      position: 'relative',
                      zIndex: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {tile.icon}
                  </div>
                </div>

                {/* Text Label */}
                <div
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: 600,
                    color: isCurrentlySelected ? '#FFFFFF' : '#E2E8F0',
                    textAlign: 'center',
                    letterSpacing: '0.2px',
                    textShadow: isCurrentlySelected ? '0 0 10px rgba(0, 200, 255, 0.7)' : 'none',
                  }}
                >
                  {tile.label}
                </div>
              </DwellButton>
            );
          })}
        </div>

        {/* ===========================
            RIGHT: "Today's News" Card
            =========================== */}
        <div
          style={{
            backgroundColor: 'rgba(18, 38, 58, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: '20px',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '100%',
          }}
        >
          {/* Card Title */}
          <div>
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#FFFFFF',
                margin: 0,
                letterSpacing: '-0.2px',
              }}
            >
              Today's News
            </h2>

            {/* Rocket Image */}
            <div
              style={{
                width: '100%',
                height: '175px',
                borderRadius: '12px',
                overflow: 'hidden',
                marginTop: '14px',
                marginBottom: '14px',
                backgroundColor: '#0F1E2E',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
              }}
            >
              <img
                src="/images/rocket_launch.jpg"
                alt="Rocket Launch"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </div>

            {/* Headline */}
            <p
              style={{
                fontSize: '1.05rem',
                fontWeight: 600,
                color: '#FFFFFF',
                lineHeight: 1.4,
                margin: 0,
              }}
            >
              ISRO's next mission set for 2026
            </p>
          </div>

          {/* Action Button: Read More -> */}
          <DwellButton
            id="home-btn-news-readmore"
            onClick={() => onNavigate('news')}
            variant="surface"
            size="normal"
            ariaLabel="Read full news article"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 20px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.24)',
              color: '#FFFFFF',
              fontSize: '0.92rem',
              fontWeight: 600,
              alignSelf: 'flex-start',
              minHeight: '38px',
              marginTop: '12px',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span>Read More</span>
            <ArrowRight size={15} />
          </DwellButton>
        </div>
      </div>

      {/* ============================================================
          BOTTOM TRANSLUCENT CAPSULE BANNER
          - Icon: ℹ️ Information circle
          - Text: Look at an option and wait for selection
          ============================================================ */}
      <footer
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            backgroundColor: 'rgba(14, 30, 48, 0.72)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: '9999px',
            backdropFilter: 'blur(16px)',
            padding: '10px 32px',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.3)',
          }}
        >
          {/* Info Icon in Cyan Circle */}
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: '#00C8FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#081420',
              fontWeight: 800,
              fontSize: '0.78rem',
              flexShrink: 0,
            }}
          >
            <Info size={13} color="#06121E" strokeWidth={3} />
          </div>

          <span
            style={{
              color: '#CBD5E1',
              fontSize: '0.94rem',
              fontWeight: 500,
              letterSpacing: '0.2px',
            }}
          >
            Look at an option and wait for selection
          </span>
        </div>
      </footer>
      </div>
    </div>
  );
};
