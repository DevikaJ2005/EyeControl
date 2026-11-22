/**
 * HomePage — EyeControl Main Dashboard
 *
 * Layout: Full-screen utilisation
 *   LEFT column (280px): Large navigation tiles — primary controls
 *   RIGHT section: 2×3 grid of secondary cards + news preview below
 *
 * Design principles:
 *   - Soft off-white background, deep navy text
 *   - Large, labelled tiles with enough hit area for gaze
 *   - No fake news content — real headline from RSS (or offline fallback)
 *   - SOS removed from header; accessible via Help page
 *   - Rest mode is a clear tile, not buried
 */

import React, { useEffect, useState } from 'react';
import { DwellButton } from '../components/DwellButton';
import { SpeechEngine } from '../speech/SpeechEngine';
import { IndiaTodayNewsService, IndiaTodayArticle } from '../services/IndiaTodayNewsService';
import { openAppWindow } from '../utils/windowLauncher';
import { SelectionManager } from '../interaction/SelectionManager';
import {
  Newspaper,
  Youtube,
  Volume2,
  Settings,
  HelpCircle,
  Target,
  Moon,
  Maximize2,
  Play,
  Square,
  ArrowRight,
  Wifi,
  ExternalLink,
  LayoutGrid,
  Eye,
  Check,
  Sparkles,
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (page: 'home' | 'speak' | 'youtube' | 'news' | 'explore' | 'help' | 'settings' | 'calibration') => void;
  onOpenSettings?: () => void;
  onToggleRest?: () => void;
}

type NavTile = {
  id: string;
  label: string;
  sub: string;
  icon: React.ReactNode;
  page: 'news' | 'youtube' | 'speak' | 'help' | 'settings' | 'calibration' | 'rest' | 'fullscreen';
  iconBg: string;
  iconColor: string;
  keyNum: string;
  primary?: boolean;
};

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, onOpenSettings, onToggleRest }) => {
  const [topHeadline, setTopHeadline] = useState<IndiaTodayArticle | null>(null);
  const [isReadingHeadline, setIsReadingHeadline] = useState(false);
  const [headlineFetched, setHeadlineFetched] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'giant_grid' | 'standard'>('giant_grid');
  const [selectionMethod, setSelectionMethod] = useState<'hybrid' | 'dwell' | 'blink'>('hybrid');

  const speechEngine = SpeechEngine.getInstance();

  // Keyboard shortcut fallback (1-6 for primary tiles)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case '1': onNavigate('news'); break;
        case '2': onNavigate('youtube'); break;
        case '3': onNavigate('speak'); break;
        case '4': onNavigate('help'); break;
        case '5': onOpenSettings ? onOpenSettings() : onNavigate('settings'); break;
        case '6': onNavigate('calibration'); break;
        case 'g': setLayoutMode((prev) => (prev === 'giant_grid' ? 'standard' : 'giant_grid')); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNavigate, onOpenSettings]);

  useEffect(() => {
    IndiaTodayNewsService.getInstance()
      .getLatestHeadlines()
      .then((articles) => {
        if (articles.length > 0) setTopHeadline(articles[0]);
        setHeadlineFetched(true);
      })
      .catch(() => setHeadlineFetched(true));
  }, []);

  const handleMethodChange = (method: 'hybrid' | 'dwell' | 'blink') => {
    setSelectionMethod(method);
    SelectionManager.getInstance().setSelectionMethod(method);
  };

  const handleReadHeadline = () => {
    if (isReadingHeadline) {
      speechEngine.stop();
      setIsReadingHeadline(false);
      return;
    }
    if (!topHeadline) return;
    setIsReadingHeadline(true);
    speechEngine.speak(
      `India Today. ${topHeadline.title}. ${topHeadline.paragraphs[0] ?? ''}`,
      () => setIsReadingHeadline(false)
    );
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const NAV_TILES: NavTile[] = [
    {
      id: 'tile-news',
      label: 'News',
      sub: 'India Today • Live Feed',
      icon: <Newspaper size={38} />,
      page: 'news',
      iconBg: '#EFF6FF',
      iconColor: '#1D4ED8',
      keyNum: '1',
      primary: true,
    },
    {
      id: 'tile-youtube',
      label: 'YouTube',
      sub: 'Watch Videos & Channels',
      icon: <Youtube size={38} />,
      page: 'youtube',
      iconBg: '#FEF2F2',
      iconColor: '#DC2626',
      keyNum: '2',
    },
    {
      id: 'tile-speak',
      label: 'Speak',
      sub: 'Communication Board',
      icon: <Volume2 size={38} />,
      page: 'speak',
      iconBg: '#F0FDF4',
      iconColor: '#16A34A',
      keyNum: '3',
    },
    {
      id: 'tile-help',
      label: 'Help & Emergency',
      sub: 'Guides, Tips & SOS',
      icon: <HelpCircle size={38} />,
      page: 'help',
      iconBg: '#FFFBEB',
      iconColor: '#B45309',
      keyNum: '4',
    },
    {
      id: 'tile-settings',
      label: 'Settings',
      sub: 'Adjust Sensitivity & Audio',
      icon: <Settings size={38} />,
      page: 'settings',
      iconBg: '#F8FAFC',
      iconColor: '#475569',
      keyNum: '5',
    },
    {
      id: 'tile-calibrate',
      label: 'Calibrate',
      sub: 'Fine-tune Gaze Accuracy',
      icon: <Target size={38} />,
      page: 'calibration',
      iconBg: '#EFF6FF',
      iconColor: '#2C5E8A',
      keyNum: '6',
    },
  ];

  const handleTileClick = (tile: NavTile) => {
    if (tile.page === 'settings' && onOpenSettings) {
      onOpenSettings();
    } else if (tile.page === 'rest') {
      onToggleRest?.();
    } else if (tile.page === 'fullscreen') {
      handleFullscreen();
    } else {
      onNavigate(tile.page as Parameters<typeof onNavigate>[0]);
    }
  };

  return (
    <main
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 20px',
        gap: '14px',
        height: 'calc(100vh - 56px)',
        overflow: 'hidden',
        backgroundColor: 'var(--background)',
      }}
    >
      {/* ============================================================
          TOP CONTROL BAR: Selection Mode & Grid Toggle
          ============================================================ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-md)',
          padding: '8px 16px',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-subtle)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            Selection Method:
          </span>
          <DwellButton
            id="btn-method-hybrid"
            onClick={() => handleMethodChange('hybrid')}
            variant={selectionMethod === 'hybrid' ? 'primary' : 'ghost'}
            size="normal"
            style={{ minHeight: '34px', padding: '4px 12px', fontSize: '0.82rem' }}
          >
            <Sparkles size={14} />
            <span>⚡ Hold or Blink (Recommended)</span>
          </DwellButton>

          <DwellButton
            id="btn-method-blink"
            onClick={() => handleMethodChange('blink')}
            variant={selectionMethod === 'blink' ? 'primary' : 'ghost'}
            size="normal"
            style={{ minHeight: '34px', padding: '4px 12px', fontSize: '0.82rem' }}
          >
            <Eye size={14} />
            <span>👁️ Blink to Select (~0.4s)</span>
          </DwellButton>

          <DwellButton
            id="btn-method-dwell"
            onClick={() => handleMethodChange('dwell')}
            variant={selectionMethod === 'dwell' ? 'primary' : 'ghost'}
            size="normal"
            style={{ minHeight: '34px', padding: '4px 12px', fontSize: '0.82rem' }}
          >
            <Target size={14} />
            <span>🎯 Hold Gaze Only</span>
          </DwellButton>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <DwellButton
            id="btn-toggle-layout-mode"
            onClick={() => setLayoutMode((prev) => (prev === 'giant_grid' ? 'standard' : 'giant_grid'))}
            variant={layoutMode === 'giant_grid' ? 'sage' : 'surface'}
            size="normal"
            style={{ minHeight: '34px', padding: '4px 14px', fontSize: '0.82rem' }}
          >
            <LayoutGrid size={15} />
            <span>{layoutMode === 'giant_grid' ? '🔲 Giant Grid Active' : '📋 Detailed View'}</span>
          </DwellButton>
        </div>
      </div>

      {/* ============================================================
          VIEW 1: GIANT QUADRANT GAZE GRID (6 Massive Targets)
          Impossible to miss, even with approximate webcam gaze!
          ============================================================ */}
      {layoutMode === 'giant_grid' ? (
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridTemplateRows: 'repeat(2, 1fr)',
            gap: '16px',
            minHeight: 0,
          }}
        >
          {NAV_TILES.map((tile) => (
            <DwellButton
              key={tile.id}
              id={tile.id}
              onClick={() => handleTileClick(tile)}
              variant={tile.primary ? 'primary' : 'surface'}
              size="card"
              showCenterRing={true}
              ariaLabel={`Option ${tile.keyNum}: ${tile.label} - ${tile.sub}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '24px',
                height: '100%',
                borderRadius: 'var(--radius-lg)',
                position: 'relative',
                boxShadow: 'var(--shadow-card)',
                transition: 'all 120ms ease-out',
                cursor: 'pointer',
              }}
            >
              {/* Giant Number Badge in Top-Left */}
              <div
                style={{
                  position: 'absolute',
                  top: '16px',
                  left: '18px',
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: tile.primary ? 'rgba(255,255,255,0.25)' : 'rgba(15, 37, 55, 0.08)',
                  color: tile.primary ? '#FFFFFF' : 'var(--text-primary)',
                  fontWeight: 900,
                  fontSize: '1.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {tile.keyNum}
              </div>

              {/* Icon */}
              <div
                style={{
                  width: '76px',
                  height: '76px',
                  borderRadius: '18px',
                  backgroundColor: tile.primary ? 'rgba(255,255,255,0.18)' : tile.iconBg,
                  color: tile.primary ? '#FFFFFF' : tile.iconColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '14px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                }}
              >
                {tile.icon}
              </div>

              {/* Title */}
              <div
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 800,
                  color: tile.primary ? '#FFFFFF' : 'var(--text-primary)',
                  lineHeight: 1.2,
                  textAlign: 'center',
                }}
              >
                {tile.label}
              </div>

              {/* Subtitle */}
              <div
                style={{
                  fontSize: '0.95rem',
                  color: tile.primary ? 'rgba(255,255,255,0.85)' : 'var(--text-secondary)',
                  marginTop: '6px',
                  textAlign: 'center',
                }}
              >
                {tile.sub}
              </div>

              {/* Interaction Hint */}
              <div
                style={{
                  marginTop: '10px',
                  fontSize: '0.78rem',
                  color: tile.primary ? 'rgba(255,255,255,0.7)' : 'var(--primary)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Look & hold or blink
              </div>
            </DwellButton>
          ))}
        </div>
      ) : (
        /* ============================================================
            VIEW 2: STANDARD SPLIT DASHBOARD WITH NEWS PREVIEW
            ============================================================ */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '320px 1fr',
            gap: '16px',
            flex: 1,
            minHeight: 0,
          }}
        >
          {/* LEFT: Navigation Column */}
          <div
            style={{
              display: 'grid',
              gridTemplateRows: 'repeat(6, 1fr)',
              gap: '10px',
            }}
          >
            {NAV_TILES.map((tile) => (
              <DwellButton
                key={tile.id}
                id={tile.id}
                onClick={() => handleTileClick(tile)}
                variant={tile.primary ? 'primary' : 'surface'}
                size="normal"
                ariaLabel={`${tile.label}: ${tile.sub}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '0 16px',
                  height: '100%',
                  textAlign: 'left',
                  borderRadius: 'var(--radius-md)',
                  justifyContent: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    backgroundColor: tile.primary ? 'rgba(255,255,255,0.18)' : tile.iconBg,
                    color: tile.primary ? '#FFFFFF' : tile.iconColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {tile.icon}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '1.05rem',
                      fontWeight: 800,
                      color: tile.primary ? '#FFFFFF' : 'var(--text-primary)',
                      lineHeight: 1.1,
                    }}
                  >
                    {tile.label}
                  </div>
                  <div
                    style={{
                      fontSize: '0.78rem',
                      color: tile.primary ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)',
                      marginTop: '2px',
                    }}
                  >
                    {tile.sub}
                  </div>
                </div>
              </DwellButton>
            ))}
          </div>

          {/* RIGHT: Live News Card */}
          <div
            style={{
              display: 'grid',
              gridTemplateRows: '1fr auto',
              gap: '12px',
              minHeight: 0,
            }}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 18px',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      color: '#DC2626',
                      textTransform: 'uppercase',
                    }}
                  >
                    India Today
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Wifi size={12} />
                    {headlineFetched ? 'Live Headline' : 'Fetching…'}
                  </span>
                </div>
                <DwellButton
                  id="home-btn-view-all-news"
                  onClick={() => onNavigate('news')}
                  variant="ghost"
                  size="normal"
                  style={{ minHeight: '34px', padding: '4px 10px', fontSize: '0.82rem' }}
                >
                  <span>All News</span>
                  <ArrowRight size={13} />
                </DwellButton>
              </div>

              <div
                style={{
                  flex: 1,
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  overflow: 'hidden',
                }}
              >
                {topHeadline ? (
                  <>
                    {topHeadline.imageUrl && (
                      <div
                        style={{
                          height: '180px',
                          borderRadius: 'var(--radius-sm)',
                          overflow: 'hidden',
                          backgroundColor: '#0F172A',
                          flexShrink: 0,
                        }}
                      >
                        <img
                          src={topHeadline.imageUrl}
                          alt={topHeadline.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <h2
                      style={{
                        fontSize: '1.15rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        lineHeight: 1.35,
                        margin: 0,
                      }}
                    >
                      {topHeadline.title}
                    </h2>
                    {topHeadline.paragraphs[0] && (
                      <p
                        style={{
                          fontSize: '0.9rem',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.5,
                          margin: 0,
                        }}
                      >
                        {topHeadline.paragraphs[0]}
                      </p>
                    )}
                  </>
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    Loading news feed…
                  </div>
                )}
              </div>

              <div
                style={{
                  padding: '10px 18px',
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  gap: '10px',
                }}
              >
                <DwellButton
                  id="home-btn-open-real-indiatoday"
                  onClick={() => openAppWindow('https://www.indiatoday.in', 'IndiaTodayWindow')}
                  variant="primary"
                  size="normal"
                  style={{ flex: 1, minHeight: '42px', fontSize: '0.9rem', backgroundColor: '#DC2626', border: 'none' }}
                >
                  <ExternalLink size={16} />
                  <span>Open Website</span>
                </DwellButton>

                <DwellButton
                  id="home-btn-read-headline"
                  onClick={handleReadHeadline}
                  variant={isReadingHeadline ? 'primary' : 'sage'}
                  size="normal"
                  disabled={!topHeadline}
                  style={{ flex: 1, minHeight: '42px', fontSize: '0.9rem' }}
                >
                  <Play size={16} />
                  <span>{isReadingHeadline ? 'Reading…' : 'Read Aloud'}</span>
                </DwellButton>

                <DwellButton
                  id="home-btn-stop-headline"
                  onClick={() => {
                    speechEngine.stop();
                    setIsReadingHeadline(false);
                  }}
                  variant="ghost"
                  size="normal"
                  disabled={!isReadingHeadline}
                  style={{ minHeight: '42px', padding: '6px 14px' }}
                >
                  <Square size={14} />
                  <span>Stop</span>
                </DwellButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          BOTTOM ACTION BAR: Rest & Fullscreen
          ============================================================ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          💡 <span style={{ fontWeight: 700, color: 'var(--secondary)' }}>3 ways to select:</span> Look at any tile and hold gaze for 0.8s, OR close eyes for 0.4s to blink-click, OR press keys 1–6.
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {onToggleRest && (
            <DwellButton
              id="home-btn-rest"
              onClick={onToggleRest}
              variant="ghost"
              size="normal"
              style={{ minHeight: '36px', padding: '4px 12px', fontSize: '0.85rem' }}
            >
              <Moon size={15} />
              <span>Rest</span>
            </DwellButton>
          )}
          <DwellButton
            id="home-btn-fullscreen"
            onClick={handleFullscreen}
            variant="ghost"
            size="normal"
            style={{ minHeight: '36px', padding: '4px 10px' }}
          >
            <Maximize2 size={15} />
          </DwellButton>
        </div>
      </div>
    </main>
  );
};
