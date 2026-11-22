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
  primary?: boolean;
};

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, onOpenSettings, onToggleRest }) => {
  const [topHeadline, setTopHeadline] = useState<IndiaTodayArticle | null>(null);
  const [isReadingHeadline, setIsReadingHeadline] = useState(false);
  const [headlineFetched, setHeadlineFetched] = useState(false);

  const speechEngine = SpeechEngine.getInstance();

  useEffect(() => {
    IndiaTodayNewsService.getInstance()
      .getLatestHeadlines()
      .then((articles) => {
        if (articles.length > 0) setTopHeadline(articles[0]);
        setHeadlineFetched(true);
      })
      .catch(() => setHeadlineFetched(true));
  }, []);

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
      sub: 'India Today • Live',
      icon: <Newspaper size={30} />,
      page: 'news',
      iconBg: '#EFF6FF',
      iconColor: '#1D4ED8',
      primary: true,
    },
    {
      id: 'tile-youtube',
      label: 'YouTube',
      sub: 'Watch videos',
      icon: <Youtube size={30} />,
      page: 'youtube',
      iconBg: '#FEF2F2',
      iconColor: '#DC2626',
    },
    {
      id: 'tile-speak',
      label: 'Speak',
      sub: 'Communication board',
      icon: <Volume2 size={30} />,
      page: 'speak',
      iconBg: '#F0FDF4',
      iconColor: '#16A34A',
    },
    {
      id: 'tile-help',
      label: 'Help',
      sub: 'Guide & emergency',
      icon: <HelpCircle size={30} />,
      page: 'help',
      iconBg: '#FFFBEB',
      iconColor: '#B45309',
    },
    {
      id: 'tile-settings',
      label: 'Settings',
      sub: 'Adjust dwell & speed',
      icon: <Settings size={30} />,
      page: 'settings',
      iconBg: '#F8FAFC',
      iconColor: '#475569',
    },
    {
      id: 'tile-calibrate',
      label: 'Calibrate',
      sub: 'Improve accuracy',
      icon: <Target size={30} />,
      page: 'calibration',
      iconBg: '#EFF6FF',
      iconColor: '#2C5E8A',
    },
  ];

  return (
    <main
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 24px',
        gap: '20px',
        height: 'calc(100vh - 56px)',
        overflow: 'hidden',
        backgroundColor: 'var(--background)',
      }}
    >
      {/* ============================================================
          TOP SECTION: LEFT nav tiles + RIGHT news preview
          ============================================================ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '300px 1fr',
          gap: '20px',
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* ===========================
            LEFT: Navigation Tiles
            =========================== */}
        <div
          style={{
            display: 'grid',
            gridTemplateRows: 'repeat(6, 1fr)',
            gap: '12px',
          }}
        >
          {NAV_TILES.map((tile) => {
            const isSettings = tile.page === 'settings';
            const isCalibrate = tile.page === 'calibration';
            return (
              <DwellButton
                key={tile.id}
                id={tile.id}
                onClick={() => {
                  if (isSettings && onOpenSettings) {
                    onOpenSettings();
                  } else if (tile.page === 'rest') {
                    onToggleRest?.();
                  } else if (tile.page === 'fullscreen') {
                    handleFullscreen();
                  } else {
                    onNavigate(tile.page as Parameters<typeof onNavigate>[0]);
                  }
                }}
                variant={tile.primary ? 'primary' : 'surface'}
                size="normal"
                ariaLabel={`${tile.label}: ${tile.sub}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '0 18px',
                  minHeight: '0',
                  height: '100%',
                  textAlign: 'left',
                  borderRadius: 'var(--radius-md)',
                  justifyContent: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '10px',
                    backgroundColor: tile.primary ? 'rgba(255,255,255,0.15)' : tile.iconBg,
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
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      color: tile.primary ? '#FFFFFF' : 'var(--text-primary)',
                      lineHeight: 1.1,
                    }}
                  >
                    {tile.label}
                  </div>
                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: tile.primary ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)',
                      marginTop: '2px',
                    }}
                  >
                    {tile.sub}
                  </div>
                </div>
              </DwellButton>
            );
          })}
        </div>

        {/* ===========================
            RIGHT: News preview + 2×3 secondary grid
            =========================== */}
        <div
          style={{
            display: 'grid',
            gridTemplateRows: '1fr auto',
            gap: '16px',
            minHeight: 0,
          }}
        >
          {/* News preview card — full height top section */}
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
            {/* Card header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
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
                    letterSpacing: '0.4px',
                  }}
                >
                  India Today
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Wifi size={12} />
                  {headlineFetched ? 'Latest News' : 'Loading…'}
                </span>
              </div>
              <DwellButton
                id="home-btn-view-all-news"
                onClick={() => onNavigate('news')}
                variant="ghost"
                size="normal"
                ariaLabel="Open full news reader"
                style={{ minHeight: '36px', padding: '5px 10px', fontSize: '0.82rem' }}
              >
                <span>All News</span>
                <ArrowRight size={13} />
              </DwellButton>
            </div>

            {/* Headline content */}
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
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      lineHeight: 1.35,
                      margin: 0,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {topHeadline.title}
                  </h2>
                  {topHeadline.paragraphs[0] && (
                    <p
                      style={{
                        fontSize: '0.88rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.5,
                        margin: 0,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {topHeadline.paragraphs[0]}
                    </p>
                  )}
                </>
              ) : (
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '0.9rem',
                  }}
                >
                  {headlineFetched ? 'No headlines available' : 'Fetching headlines…'}
                </div>
              )}
            </div>

            {/* Actions: Open Real Website + Read Aloud */}
            <div
              style={{
                padding: '12px 18px',
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
                ariaLabel="Launch real India Today website in standalone window"
                style={{ flex: 1, minHeight: '44px', fontSize: '0.9rem', backgroundColor: '#DC2626', border: 'none' }}
              >
                <ExternalLink size={16} />
                <span>Open Website</span>
              </DwellButton>

              <DwellButton
                id="home-btn-read-headline"
                onClick={handleReadHeadline}
                variant={isReadingHeadline ? 'primary' : 'sage'}
                size="normal"
                ariaLabel={isReadingHeadline ? 'Stop reading' : 'Read headline aloud'}
                disabled={!topHeadline}
                style={{ flex: 1, minHeight: '44px', fontSize: '0.9rem' }}
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
                ariaLabel="Stop reading"
                style={{ minHeight: '44px', padding: '8px 14px', fontSize: '0.9rem' }}
              >
                <Square size={14} />
                <span>Stop</span>
              </DwellButton>
            </div>
          </div>

          {/* Bottom action bar: Rest + Fullscreen */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              justifyContent: 'space-between',
              padding: '10px 16px',
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                fontSize: '0.9rem',
                color: 'var(--text-secondary)',
                fontWeight: 500,
              }}
            >
              Look at a tile and hold your gaze for{' '}
              <span style={{ fontWeight: 700, color: 'var(--secondary)' }}>~1 second</span> to select.
              A blue ring shows selection progress.
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {onToggleRest && (
                <DwellButton
                  id="home-btn-rest"
                  onClick={onToggleRest}
                  variant="ghost"
                  size="normal"
                  ariaLabel="Enter Rest Mode — pause all tracking"
                  style={{ minHeight: '40px', padding: '6px 14px', fontSize: '0.88rem', whiteSpace: 'nowrap' }}
                >
                  <Moon size={16} />
                  <span>Rest</span>
                </DwellButton>
              )}
              <DwellButton
                id="home-btn-fullscreen"
                onClick={handleFullscreen}
                variant="ghost"
                size="normal"
                ariaLabel="Toggle fullscreen"
                style={{ minHeight: '40px', padding: '6px 10px' }}
              >
                <Maximize2 size={16} />
              </DwellButton>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
