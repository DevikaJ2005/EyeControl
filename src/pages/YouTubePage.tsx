/**
 * YouTubePage — Real YouTube Window Launcher
 *
 * Opens the actual YouTube website (youtube.com) in a dedicated standalone
 * browser window centered over EyeControl, exactly as requested.
 *
 * Provides:
 * - Direct 1-dwell launcher for the real YouTube homepage
 * - Direct launchers for Trending, Music, Subscriptions, Search, Live News
 * - Seamless return to EyeControl Home
 */

import React, { useState } from 'react';
import { DwellButton } from '../components/DwellButton';
import { openAppWindow } from '../utils/windowLauncher';
import {
  Home,
  ExternalLink,
  Flame,
  Music2,
  Search,
  TrendingUp,
  Tv2,
  Youtube,
  Info,
  PlaySquare,
  Sparkles,
} from 'lucide-react';

interface YouTubePageProps {
  onNavigateHome: () => void;
}

type QuickLink = {
  id: string;
  label: string;
  url: string;
  description: string;
  icon: React.ReactNode;
  color: string;
};

const QUICK_LINKS: QuickLink[] = [
  {
    id: 'yt-home',
    label: 'YouTube Home',
    url: 'https://www.youtube.com',
    description: 'Your actual feed, home videos & subscriptions',
    icon: <Youtube size={28} />,
    color: '#DC2626',
  },
  {
    id: 'yt-trending',
    label: 'Trending Videos',
    url: 'https://www.youtube.com/feed/trending',
    description: 'Trending in India — music, movies, viral',
    icon: <Flame size={28} />,
    color: '#EA580C',
  },
  {
    id: 'yt-music',
    label: 'YouTube Music',
    url: 'https://music.youtube.com',
    description: 'Listen to songs, albums & playlists',
    icon: <Music2 size={28} />,
    color: '#7C3AED',
  },
  {
    id: 'yt-news',
    label: 'India Today Live Channel',
    url: 'https://www.youtube.com/@indiatoday/live',
    description: 'Watch India Today live stream directly',
    icon: <Tv2 size={28} />,
    color: '#DC2626',
  },
  {
    id: 'yt-subscriptions',
    label: 'Subscriptions',
    url: 'https://www.youtube.com/feed/subscriptions',
    description: 'Channels and creators you follow',
    icon: <PlaySquare size={28} />,
    color: '#0284C7',
  },
  {
    id: 'yt-search',
    label: 'Search Indian News & Shows',
    url: 'https://www.youtube.com/results?search_query=indian+news+live',
    description: 'Live news broadcasts and analysis',
    icon: <Search size={28} />,
    color: '#059669',
  },
];

export const YouTubePage: React.FC<YouTubePageProps> = ({ onNavigateHome }) => {
  const [lastOpened, setLastOpened] = useState<string | null>(null);

  const handleOpen = (url: string, label: string) => {
    openAppWindow(url, 'YouTubeWindow');
    setLastOpened(label);
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--background)',
        height: 'calc(100vh - 56px)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 24px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#FEF2F2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#DC2626',
            }}
          >
            <Youtube size={26} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)', lineHeight: 1.1 }}>
              YouTube App
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Opens the real YouTube website in a dedicated window
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {lastOpened && (
            <div
              style={{
                fontSize: '0.85rem',
                color: '#16A34A',
                backgroundColor: '#F0FDF4',
                border: '1px solid #BBF7D0',
                padding: '6px 14px',
                borderRadius: '99px',
                fontWeight: 700,
              }}
            >
              ✓ Window Active: {lastOpened}
            </div>
          )}
          <DwellButton
            id="yt-btn-home"
            onClick={onNavigateHome}
            variant="sage"
            size="normal"
            ariaLabel="Return to Home Dashboard"
            style={{ minHeight: '44px', padding: '8px 18px', fontSize: '0.95rem' }}
          >
            <Home size={18} />
            <span>Home</span>
          </DwellButton>
        </div>
      </div>

      {/* Main Container */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {/* Giant Hero Launcher Card */}
        <DwellButton
          id="yt-open-main"
          onClick={() => handleOpen('https://www.youtube.com', 'YouTube Home')}
          variant="primary"
          size="large"
          showCenterRing={true}
          ariaLabel="Launch Real YouTube Website in Window"
          style={{
            width: '100%',
            minHeight: '110px',
            fontSize: '1.45rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '18px',
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
            boxShadow: '0 8px 24px rgba(220, 38, 38, 0.25)',
            border: 'none',
          }}
        >
          <Youtube size={44} color="#FFFFFF" />
          <div style={{ textAlign: 'left' }}>
            <div>Launch YouTube Website</div>
            <div style={{ fontSize: '0.92rem', fontWeight: 500, color: 'rgba(255,255,255,0.85)', marginTop: '4px' }}>
              Opens real youtube.com in a standalone popup window over EyeControl
            </div>
          </div>
          <ExternalLink size={26} color="#FFFFFF" style={{ marginLeft: '12px' }} />
        </DwellButton>

        {/* Quick Links / Specific Sections */}
        <div>
          <div
            style={{
              fontSize: '0.9rem',
              fontWeight: 800,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Sparkles size={16} color="var(--secondary)" />
            <span>Direct Section Launchers</span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '14px',
            }}
          >
            {QUICK_LINKS.map((link) => (
              <DwellButton
                key={link.id}
                id={link.id}
                onClick={() => handleOpen(link.url, link.label)}
                variant="surface"
                size="normal"
                ariaLabel={`Open ${link.label} in window`}
                style={{
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '16px 20px',
                  minHeight: '100px',
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'left',
                }}
              >
                <div style={{ color: link.color, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {link.icon}
                  <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {link.label}
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  {link.description}
                </div>
              </DwellButton>
            ))}
          </div>
        </div>

        {/* Accessibility & Hands-Free Interaction Info Box */}
        <div
          style={{
            backgroundColor: '#EFF6FF',
            border: '1.5px solid #BFDBFE',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            display: 'flex',
            gap: '14px',
            alignItems: 'flex-start',
            marginTop: 'auto',
          }}
        >
          <Info size={22} color="#1D4ED8" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.92rem', color: '#1E40AF', lineHeight: 1.55 }}>
            <strong>How hands-free browsing works:</strong> When you launch YouTube, it opens as a standalone browser
            window centered on your screen. You can sign in, browse videos, read comments, and search freely.
            Use EyeControl's <strong>Head Tracking mode</strong> (or gaze pointer) to point and click inside the window,
            or click back onto the EyeControl bar anytime.
          </div>
        </div>
      </div>
    </div>
  );
};
