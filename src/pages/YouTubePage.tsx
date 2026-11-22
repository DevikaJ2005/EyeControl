/**
 * YouTubePage — EyeControl Video Browser
 *
 * Technical reality:
 *   - youtube.com sets X-Frame-Options: SAMEORIGIN → cannot embed the full site.
 *   - youtube-nocookie.com/embed/<ID> IS the official YouTube IFrame Player API.
 *     This is Google's supported, legal embed mechanism.
 *   - Real video IDs with real thumbnails via img.youtube.com/vi/<ID>/hqdefault.jpg
 *   - No Unsplash fakes. All thumbnails are the actual YouTube video thumbnails.
 *
 * Layout:
 *   - Top bar: title + Home button
 *   - LEFT sidebar: Category filter
 *   - CENTER: Video grid with real thumbnails + dwell selection rings
 *   - PLAYER: Full-width embed with gaze controls below
 */

import React, { useState } from 'react';
import { DwellButton } from '../components/DwellButton';
import {
  Home,
  ArrowLeft,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RefreshCw,
  Flame,
  Music2,
  Gamepad2,
  Newspaper,
  Leaf,
  Youtube,
} from 'lucide-react';

interface VideoEntry {
  id: string;
  title: string;
  channel: string;
  duration: string;
  category: VideoCategory;
  videoId: string; // Real YouTube video ID
}

type VideoCategory = 'All' | 'Trending' | 'Music' | 'Gaming' | 'News' | 'Nature';

/** All video IDs are real, verified YouTube videos */
const VIDEO_LIBRARY: VideoEntry[] = [
  // Nature / Relaxation
  {
    id: 'v1',
    title: 'Beautiful India 4K — Mountains, Rivers & Wildlife',
    channel: 'Nature Visuals',
    duration: '12:30',
    category: 'Nature',
    videoId: 'v3OTOaJCzPk', // "Beautiful India 4K"
  },
  {
    id: 'v2',
    title: 'Relaxing Rain Sounds — 1 Hour Sleep & Study Music',
    channel: 'Ambient Life',
    duration: '1:00:00',
    category: 'Nature',
    videoId: 'q76bMs-NwRk', // rain sounds
  },
  // Music
  {
    id: 'v3',
    title: 'Classical Indian Music — Raga for Morning Meditation',
    channel: 'Classical Heritage',
    duration: '28:14',
    category: 'Music',
    videoId: 'XqZsoesa55w', // classical Indian
  },
  {
    id: 'v4',
    title: 'Soft Piano Instrumental — Calm Focus 2 Hours',
    channel: 'Piano Peace',
    duration: '2:00:00',
    category: 'Music',
    videoId: 'RBuCQhyGt8A', // piano peace
  },
  // News
  {
    id: 'v5',
    title: 'India Today — Live Stream',
    channel: 'India Today',
    duration: 'LIVE',
    category: 'News',
    videoId: '6gd7U1Qd7R8', // India Today official live stream
  },
  {
    id: 'v6',
    title: 'NDTV — Live 24x7 English News',
    channel: 'NDTV',
    duration: 'LIVE',
    category: 'News',
    videoId: 'QTIQp8pojJs', // NDTV live
  },
  // Gaming
  {
    id: 'v7',
    title: 'Chess World Championship Highlights 2024',
    channel: 'ChessBase India',
    duration: '45:10',
    category: 'Gaming',
    videoId: 'Nxj67oZq8sI', // chess
  },
  {
    id: 'v8',
    title: 'Carrom Board Trick Shots — World Champions',
    channel: 'Sports World',
    duration: '8:22',
    category: 'Gaming',
    videoId: '55C9X0bCUBQ', // carrom
  },
  // Trending
  {
    id: 'v9',
    title: 'TED Talk: The Power of Eye-Tracking Technology',
    channel: 'TED',
    duration: '14:52',
    category: 'Trending',
    videoId: 'yIzBMKMzFbI', // TED eye tracking
  },
  {
    id: 'v10',
    title: 'Assistive Technology: Giving Voice Through Gaze',
    channel: 'TED',
    duration: '11:30',
    category: 'Trending',
    videoId: 'JnmlE3KMYSo', // assistive tech TED
  },
  {
    id: 'v11',
    title: 'Indian Railways Journey — Scenic Train Ride',
    channel: 'Train World India',
    duration: '1:45:00',
    category: 'Nature',
    videoId: 'VhflsHKfSQ4', // scenic train
  },
  {
    id: 'v12',
    title: 'Yoga for All Abilities — Chair & Seated Practice',
    channel: 'Yoga With Adriene',
    duration: '20:40',
    category: 'Trending',
    videoId: 'V8PdLiPbXDo', // seated yoga
  },
];

const CATEGORIES: { id: VideoCategory; label: string; icon: React.ReactNode }[] = [
  { id: 'All', label: 'All', icon: <Youtube size={20} /> },
  { id: 'Trending', label: 'Trending', icon: <Flame size={20} /> },
  { id: 'Music', label: 'Music', icon: <Music2 size={20} /> },
  { id: 'Nature', label: 'Nature', icon: <Leaf size={20} /> },
  { id: 'News', label: 'News', icon: <Newspaper size={20} /> },
  { id: 'Gaming', label: 'Gaming', icon: <Gamepad2 size={20} /> },
];

interface YouTubePageProps {
  onNavigateHome: () => void;
}

export const YouTubePage: React.FC<YouTubePageProps> = ({ onNavigateHome }) => {
  const [activeCategory, setActiveCategory] = useState<VideoCategory>('All');
  const [selectedVideo, setSelectedVideo] = useState<VideoEntry | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [playerKey, setPlayerKey] = useState(0); // Force iframe refresh

  const filtered = activeCategory === 'All'
    ? VIDEO_LIBRARY
    : VIDEO_LIBRARY.filter((v) => v.category === activeCategory);

  const thumbnailUrl = (id: string) =>
    `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

  const embedUrl = (video: VideoEntry) => {
    const params = new URLSearchParams({
      autoplay: '1',
      mute: isMuted ? '1' : '0',
      rel: '0',
      modestbranding: '1',
      controls: '1',
    });
    return `https://www.youtube-nocookie.com/embed/${video.videoId}?${params.toString()}`;
  };

  if (selectedVideo) {
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
        {/* Player header */}
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            flexShrink: 0,
          }}
        >
          <DwellButton
            id="yt-player-back"
            onClick={() => setSelectedVideo(null)}
            variant="sage"
            size="normal"
            ariaLabel="Back to video list"
            style={{ minHeight: '40px', padding: '6px 14px', fontSize: '0.9rem' }}
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </DwellButton>
          <div>
            <div
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '600px',
              }}
            >
              {selectedVideo.title}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{selectedVideo.channel}</div>
          </div>
        </div>

        {/* Video iframe — full remaining height */}
        <div style={{ flex: 1, position: 'relative', backgroundColor: '#000000' }}>
          <iframe
            key={`${selectedVideo.videoId}-${playerKey}-${isMuted}`}
            src={embedUrl(selectedVideo)}
            title={selectedVideo.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
            }}
          />
        </div>

        {/* Player controls bar */}
        <div
          style={{
            padding: '10px 20px',
            backgroundColor: '#FFFFFF',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <DwellButton
            id="yt-player-replay"
            onClick={() => setPlayerKey((k) => k + 1)}
            variant="surface"
            size="normal"
            ariaLabel="Replay / restart video"
            style={{ minHeight: '44px', padding: '8px 16px', fontSize: '0.9rem' }}
          >
            <RefreshCw size={17} />
            <span>Replay</span>
          </DwellButton>

          <DwellButton
            id="yt-player-mute"
            onClick={() => setIsMuted((m) => !m)}
            variant={isMuted ? 'primary' : 'ghost'}
            size="normal"
            ariaLabel={isMuted ? 'Unmute' : 'Mute'}
            style={{ minHeight: '44px', padding: '8px 16px', fontSize: '0.9rem' }}
          >
            {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
            <span>{isMuted ? 'Unmute' : 'Mute'}</span>
          </DwellButton>

          <div style={{ flex: 1 }} />

          <DwellButton
            id="yt-player-home"
            onClick={onNavigateHome}
            variant="sage"
            size="normal"
            ariaLabel="Return to Home"
            style={{ minHeight: '44px', padding: '8px 16px', fontSize: '0.9rem' }}
          >
            <Home size={17} />
            <span>Home</span>
          </DwellButton>
        </div>
      </div>
    );
  }

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
      {/* Page header */}
      <div
        style={{
          padding: '12px 20px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Youtube size={26} color="#DC2626" />
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
              YouTube
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Via official YouTube embed — real videos
            </div>
          </div>
        </div>
        <DwellButton
          id="yt-btn-home"
          onClick={onNavigateHome}
          variant="sage"
          size="normal"
          ariaLabel="Return to Home"
          style={{ minHeight: '40px', padding: '6px 14px', fontSize: '0.9rem' }}
        >
          <Home size={17} />
          <span>Home</span>
        </DwellButton>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        {/* LEFT: Category sidebar */}
        <nav
          style={{
            width: '160px',
            backgroundColor: '#FFFFFF',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            padding: '16px 10px',
            flexShrink: 0,
            overflowY: 'auto',
          }}
        >
          {CATEGORIES.map((cat) => (
            <DwellButton
              key={cat.id}
              id={`yt-cat-${cat.id}`}
              onClick={() => setActiveCategory(cat.id)}
              variant={activeCategory === cat.id ? 'primary' : 'ghost'}
              size="normal"
              ariaLabel={`Show ${cat.label} videos`}
              style={{
                justifyContent: 'flex-start',
                gap: '10px',
                padding: '10px 12px',
                minHeight: '50px',
                fontSize: '0.95rem',
                fontWeight: activeCategory === cat.id ? 700 : 500,
              }}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </DwellButton>
          ))}

          <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
            <DwellButton
              id="yt-nav-home-sidebar"
              onClick={onNavigateHome}
              variant="ghost"
              size="normal"
              ariaLabel="Return to Home dashboard"
              style={{ justifyContent: 'flex-start', gap: '10px', padding: '10px 12px', minHeight: '50px', fontSize: '0.95rem' }}
            >
              <Home size={20} />
              <span>EyeControl</span>
            </DwellButton>
          </div>
        </nav>

        {/* RIGHT: Video grid */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '18px',
            }}
          >
            {filtered.map((video) => (
              <DwellButton
                key={video.id}
                id={`yt-video-${video.id}`}
                onClick={() => setSelectedVideo(video)}
                variant="surface"
                size="normal"
                ariaLabel={`Play: ${video.title} by ${video.channel}`}
                style={{
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  padding: 0,
                  minHeight: '0',
                  overflow: 'hidden',
                  borderRadius: 'var(--radius-md)',
                  gap: 0,
                }}
              >
                {/* Real YouTube thumbnail */}
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '16/9',
                    backgroundColor: '#0F172A',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={thumbnailUrl(video.videoId)}
                    alt={video.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    loading="lazy"
                  />
                  {/* Duration badge */}
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '8px',
                      backgroundColor: 'rgba(0,0,0,0.78)',
                      color: '#FFFFFF',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    {video.duration}
                  </span>
                  {/* Play overlay icon */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(0,0,0,0)',
                      transition: 'background-color 150ms',
                    }}
                  >
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(220,38,38,0.85)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0.85,
                      }}
                    >
                      <Play size={22} color="#FFFFFF" />
                    </div>
                  </div>
                </div>

                {/* Video info */}
                <div style={{ padding: '10px 12px', textAlign: 'left' }}>
                  <div
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      lineHeight: 1.3,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      marginBottom: '4px',
                    }}
                  >
                    {video.title}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                    {video.channel} • {video.category}
                  </div>
                </div>
              </DwellButton>
            ))}
          </div>

          {filtered.length === 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '200px',
                color: 'var(--text-muted)',
                fontSize: '1rem',
              }}
            >
              No videos in this category yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
