/**
 * YouTubePage (/youtube)
 * Design 3: YouTube Explorer
 * Matching the reference layout:
 * - Top header with YouTube logo, gaze-friendly search bar, and Home button
 * - Left categories navigation (Home, Trending, Music, Gaming, News, Back)
 * - Main Grid of curated high-definition videos with duration badges and Blue Gaze Selection Rings
 * - Embedded video player with Assistive Gaze Shield to prevent cross-origin mouse trapping
 * - Bottom playback controls: Play Video, Pause, Back, Home
 */

import React, { useState } from 'react';
import { DwellButton } from '../components/DwellButton';
import {
  Youtube,
  Search,
  Home,
  Flame,
  Music,
  Gamepad2,
  Newspaper,
  ArrowLeft,
  Play,
  Pause,
  ShieldCheck,
  Shield,
  XCircle,
  ExternalLink,
} from 'lucide-react';

interface YouTubeVideo {
  id: string;
  title: string;
  channel: string;
  duration: string;
  category: 'Trending' | 'Music' | 'Gaming' | 'News' | 'Relaxing';
  thumbnailUrl: string;
  embedUrl: string;
}

const YOUTUBE_LIBRARY: YouTubeVideo[] = [
  {
    id: 'vid-india-4k',
    title: 'Beautiful India 4K - Scenic Landscapes & Natural Wonders',
    channel: 'Tech Travel & Nature',
    duration: '12:45',
    category: 'Relaxing',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506461883276-594a12b11cf3?auto=format&fit=crop&w=600&q=80',
    embedUrl: 'https://www.youtube-nocookie.com/embed/nepM33e1r14',
  },
  {
    id: 'vid-puppy',
    title: 'Cute Animals & Calming Nature - 1 Hour Relaxation',
    channel: 'Pet World Comfort',
    duration: '8:20',
    category: 'Relaxing',
    thumbnailUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=600&q=80',
    embedUrl: 'https://www.youtube-nocookie.com/embed/xNN7iTA57jM',
  },
  {
    id: 'vid-news-live',
    title: 'India Today 24x7 Live Stream & Special Coverage',
    channel: 'India Today Official',
    duration: 'LIVE',
    category: 'News',
    thumbnailUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=600&q=80',
    embedUrl: 'https://www.youtube-nocookie.com/embed/6gd7U1Qd7R8',
  },
  {
    id: 'vid-acoustic',
    title: 'Peaceful Acoustic Guitar Instrumental Session for Reading',
    channel: 'Ambient Sounds Studio',
    duration: '15:30',
    category: 'Music',
    thumbnailUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
    embedUrl: 'https://www.youtube-nocookie.com/embed/2OEL4P1Rz04',
  },
  {
    id: 'vid-tech-cv',
    title: 'How Computer Vision and Eye-Tracking Works',
    channel: 'Science & AI Explained',
    duration: '10:15',
    category: 'Trending',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80',
    embedUrl: 'https://www.youtube-nocookie.com/embed/S_8N1Fh_1mQ',
  },
  {
    id: 'vid-gaming',
    title: 'Relaxing Flight Simulator - Mountain Ranges in 4K',
    channel: 'Aero Gaming World',
    duration: '18:00',
    category: 'Gaming',
    thumbnailUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80',
    embedUrl: 'https://www.youtube-nocookie.com/embed/6gd7U1Qd7R8',
  },
];

interface YouTubePageProps {
  onNavigateHome: () => void;
}

export const YouTubePage: React.FC<YouTubePageProps> = ({ onNavigateHome }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Home');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeVideo, setActiveVideo] = useState<YouTubeVideo | null>(null);
  const [isGazeShieldActive, setIsGazeShieldActive] = useState(true);

  // Filtered videos based on category and search query
  const filteredVideos = YOUTUBE_LIBRARY.filter((v) => {
    const matchesCategory =
      selectedCategory === 'Home' ||
      v.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.channel.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div
      style={{
        flex: 1,
        maxWidth: '1440px',
        margin: '0 auto',
        width: '100%',
        padding: '20px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        height: 'calc(100vh - 90px)',
      }}
    >
      {/* ========================================================================= */}
      {/* TOP SEARCH BAR & HEADER (MATCHING DESIGN 3)                               */}
      {/* ========================================================================= */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-lg)',
          border: '2px solid var(--border)',
          padding: '12px 24px',
          boxShadow: 'var(--shadow-card)',
          gap: '20px',
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Youtube size={24} />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>
            YouTube
          </span>
        </div>

        {/* Search Input Bar */}
        <div
          style={{
            flex: 1,
            maxWidth: '600px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Search
            size={18}
            color="var(--text-muted)"
            style={{ position: 'absolute', left: '16px', pointerEvents: 'none' }}
          />
          <input
            type="text"
            placeholder="Search videos, documentaries, relaxing sounds..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 18px 12px 46px',
              borderRadius: 'var(--radius-full)',
              border: '2px solid var(--border)',
              backgroundColor: '#F8FAFC',
              fontSize: '1rem',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '14px',
                color: 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.9rem',
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Home Navigation */}
        <DwellButton
          id="yt-btn-header-home"
          onClick={onNavigateHome}
          variant="sage"
          size="normal"
          ariaLabel="Return to Home Dashboard"
          style={{ minHeight: '48px', padding: '10px 18px' }}
        >
          <Home size={20} />
          <span>Home</span>
        </DwellButton>
      </header>

      {/* ========================================================================= */}
      {/* MAIN VIEW: LEFT SIDEBAR CATEGORIES + RIGHT VIDEO GRID OR ACTIVE PLAYER     */}
      {/* ========================================================================= */}
      {!activeVideo ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '200px 1fr',
            gap: '24px',
            flex: 1,
            overflow: 'hidden',
          }}
        >
          {/* Left Categories Sidebar */}
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
            aria-label="YouTube Categories"
          >
            {[
              { id: 'Home', icon: <Home size={20} /> },
              { id: 'Trending', icon: <Flame size={20} color="#EA580C" /> },
              { id: 'Music', icon: <Music size={20} color="#2563EB" /> },
              { id: 'Gaming', icon: <Gamepad2 size={20} color="#9333EA" /> },
              { id: 'News', icon: <Newspaper size={20} color="#DC2626" /> },
            ].map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <DwellButton
                  key={cat.id}
                  id={`yt-cat-${cat.id}`}
                  onClick={() => setSelectedCategory(cat.id)}
                  variant={isSelected ? 'primary' : 'surface'}
                  size="normal"
                  ariaLabel={`Filter by ${cat.id}`}
                  style={{
                    justifyContent: 'flex-start',
                    padding: '12px 16px',
                    gap: '12px',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  {cat.icon}
                  <span>{cat.id}</span>
                </DwellButton>
              );
            })}

            <DwellButton
              id="yt-btn-side-back"
              onClick={onNavigateHome}
              variant="ghost"
              size="normal"
              ariaLabel="Back to Home Dashboard"
              style={{
                justifyContent: 'flex-start',
                padding: '12px 16px',
                gap: '12px',
                marginTop: 'auto',
              }}
            >
              <ArrowLeft size={20} />
              <span>Back</span>
            </DwellButton>
          </nav>

          {/* Right Video Grid */}
          <main
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-lg)',
              border: '2px solid var(--border)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              boxShadow: 'var(--shadow-card)',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Recommended for you ({selectedCategory})
              </h2>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                {filteredVideos.length} videos available
              </span>
            </div>

            {/* Grid of Video Cards with Blue Selection Rings */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '20px',
              }}
            >
              {filteredVideos.map((video) => (
                <DwellButton
                  key={video.id}
                  id={`yt-card-${video.id}`}
                  onClick={() => setActiveVideo(video)}
                  variant="surface"
                  size="card"
                  showCenterRing={true}
                  ariaLabel={`Play video: ${video.title}`}
                  style={{
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    padding: '16px',
                    minHeight: '260px',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  {/* Thumbnail Image Container */}
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '160px',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      backgroundColor: '#0F172A',
                    }}
                  >
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {/* Duration Badge */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        right: '8px',
                        backgroundColor: 'rgba(0, 0, 0, 0.85)',
                        color: '#FFFFFF',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-xs)',
                      }}
                    >
                      {video.duration}
                    </div>
                  </div>

                  {/* Title & Channel */}
                  <div style={{ marginTop: '12px', textAlign: 'left' }}>
                    <div
                      style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        lineHeight: 1.3,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {video.title}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {video.channel}
                    </div>
                  </div>
                </DwellButton>
              ))}
            </div>
          </main>
        </div>
      ) : (
        /* ACTIVE EMBEDDED PLAYER VIEW WITH ASSISTIVE SHIELD */
        <main
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-lg)',
            border: '2px solid var(--border)',
            padding: '24px 32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            boxShadow: 'var(--shadow-card)',
            flex: 1,
            overflowY: 'auto',
          }}
        >
          {/* Top Video Header Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <DwellButton
                id="yt-btn-player-back"
                onClick={() => setActiveVideo(null)}
                variant="emergency"
                size="large"
                ariaLabel="Exit video and return to library"
                style={{ minHeight: '56px', padding: '10px 22px', fontWeight: 700 }}
              >
                <XCircle size={22} />
                <span>Close Video</span>
              </DwellButton>

              <DwellButton
                id="yt-btn-player-home"
                onClick={onNavigateHome}
                variant="sage"
                size="large"
                ariaLabel="Return to Home Dashboard"
                style={{ minHeight: '56px', padding: '10px 22px' }}
              >
                <Home size={22} />
                <span>Return Home</span>
              </DwellButton>
            </div>

            {/* Gaze Protection Shield Toggle */}
            <DwellButton
              id="yt-btn-player-shield"
              onClick={() => setIsGazeShieldActive(!isGazeShieldActive)}
              variant={isGazeShieldActive ? 'primary' : 'surface'}
              size="normal"
              ariaLabel="Toggle gaze click shield for YouTube player"
              style={{ minHeight: '50px', padding: '10px 18px' }}
            >
              {isGazeShieldActive ? <ShieldCheck size={20} /> : <Shield size={20} />}
              <span>{isGazeShieldActive ? 'Gaze Shield Active 🛡️' : 'Shield Off (Touch Active)'}</span>
            </DwellButton>
          </div>

          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            {activeVideo.title}
          </h1>

          {/* 16:9 Responsive Player with Pointer-Events Shield */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              paddingBottom: '56.25%',
              backgroundColor: '#000000',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              border: isGazeShieldActive ? '3px solid var(--gaze-blue)' : '2px solid var(--border)',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.25)',
            }}
          >
            <iframe
              src={`${activeVideo.embedUrl}?autoplay=1&rel=0&modestbranding=1`}
              title={activeVideo.title}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 0,
                pointerEvents: isGazeShieldActive ? 'none' : 'auto',
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />

            {isGazeShieldActive && (
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  backgroundColor: 'rgba(15, 23, 42, 0.85)',
                  color: '#38BDF8',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  pointerEvents: 'none',
                }}
              >
                <ShieldCheck size={16} />
                <span>Protected Gaze Mode</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
              Channel: <strong>{activeVideo.channel}</strong>
            </span>
            <a
              href={`https://www.youtube.com/watch?v=${activeVideo.id}`}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem', color: 'var(--secondary)', fontWeight: 600 }}
            >
              <span>Watch on YouTube</span>
              <ExternalLink size={16} />
            </a>
          </div>
        </main>
      )}

      {/* ========================================================================= */}
      {/* BOTTOM ACTION BAR (MATCHING DESIGN 3)                                     */}
      {/* ========================================================================= */}
      <footer
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-lg)',
          border: '2px solid var(--border)',
          padding: '10px 24px',
          boxShadow: 'var(--shadow-card)',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', gap: '12px' }}>
          <DwellButton
            id="yt-btn-bot-play"
            onClick={() => {}}
            variant="primary"
            size="normal"
            ariaLabel="Play video"
            style={{ minHeight: '48px', padding: '8px 20px' }}
          >
            <Play size={18} />
            <span>Play Video</span>
          </DwellButton>

          <DwellButton
            id="yt-btn-bot-pause"
            onClick={() => {}}
            variant="surface"
            size="normal"
            ariaLabel="Pause video"
            style={{ minHeight: '48px', padding: '8px 20px' }}
          >
            <Pause size={18} />
            <span>Pause</span>
          </DwellButton>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <DwellButton
            id="yt-btn-bot-back"
            onClick={() => {
              if (activeVideo) setActiveVideo(null);
              else onNavigateHome();
            }}
            variant="surface"
            size="normal"
            ariaLabel="Back"
            style={{ minHeight: '48px', padding: '8px 20px' }}
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </DwellButton>

          <DwellButton
            id="yt-btn-bot-home"
            onClick={onNavigateHome}
            variant="sage"
            size="normal"
            ariaLabel="Home"
            style={{ minHeight: '48px', padding: '8px 20px' }}
          >
            <Home size={18} />
            <span>Home</span>
          </DwellButton>
        </div>
      </footer>
    </div>
  );
};
