/**
 * ExplorePage (/explore)
 * Page 5: Read & Watch.
 * Section A: News reader with compulsory reading protection mode (saccade lockout over text).
 * Section B: Curated accessible video player.
 */

import React, { useState, useEffect } from 'react';
import { DwellButton } from '../components/DwellButton';
import { SelectionManager } from '../interaction/SelectionManager';
import { SpeechEngine } from '../speech/SpeechEngine';
import { Newspaper, Play, Pause, Square, ArrowLeft, ExternalLink, Video } from 'lucide-react';

interface NewsArticle {
  id: string;
  title: string;
  source: string;
  date: string;
  content: string;
  url: string;
}

interface CuratedVideo {
  id: string;
  title: string;
  description: string;
  embedUrl: string;
}

const SAMPLE_ARTICLES: NewsArticle[] = [
  {
    id: 'art-1',
    title: 'ISRO Announces Next Generation Space Exploration Missions',
    source: 'India Today',
    date: 'Recent',
    url: 'https://www.indiatoday.in/science',
    content: `The Indian Space Research Organisation has unveiled its upcoming roadmap for deep space exploration and environmental satellite monitoring. The agency emphasized that high-resolution weather tracking satellites will dramatically enhance monsoon forecasting and agricultural planning across South Asia. Advanced planetary orbiters and robotic landers are scheduled for development through domestic technological partnerships.`,
  },
  {
    id: 'art-2',
    title: 'Clean Energy Investments Reach Historic Milestone Globally',
    source: 'India Today',
    date: 'Recent',
    url: 'https://www.indiatoday.in/environment',
    content: `Global investments into renewable solar and wind installations exceeded conventional power expenditures for the third consecutive year. Analysts highlight rapid efficiency gains in battery storage systems, allowing decentralized regional power grids to maintain uninterrupted electrical delivery even during extreme climate events. Affordable local microgrids are expanding across rural districts.`,
  },
  {
    id: 'art-3',
    title: 'Breakthrough in Non-Invasive Assistive Technology Standards',
    source: 'Assistive Tech World',
    date: 'Recent',
    url: 'https://www.w3.org/WAI/',
    content: `International accessibility consortiums have published upgraded guidelines prioritizing universal hands-free computer control. The new WCAG 2.2 specifications emphasize generous visual touch targets, deterministic dwell timing without accidental activations, and sensory fatigue mitigation. Developers are encouraged to build local-first computer vision algorithms that operate seamlessly on standard hardware.`,
  },
];

const CURATED_VIDEOS: CuratedVideo[] = [
  {
    id: 'vid-1',
    title: 'Calming Ocean Waves & Coastal Nature',
    description: 'Gentle, scenic aerial view of tranquil ocean waters.',
    embedUrl: 'https://www.youtube-nocookie.com/embed/nepM33e1r14',
  },
  {
    id: 'vid-2',
    title: 'Forest Wildlife & Bird Songs',
    description: 'Peaceful walking journey through deep pine forests.',
    embedUrl: 'https://www.youtube-nocookie.com/embed/xNN7iTA57jM',
  },
];

export const ExplorePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'news' | 'videos'>('news');
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<CuratedVideo | null>(null);
  const [isReadingAloud, setIsReadingAloud] = useState(false);

  const selectionManager = SelectionManager.getInstance();
  const speechEngine = SpeechEngine.getInstance();

  // Enforce Reading Protection Mode when an article is open
  useEffect(() => {
    if (selectedArticle) {
      selectionManager.setReadingMode(true);
    } else {
      selectionManager.setReadingMode(false);
      speechEngine.stop();
      setIsReadingAloud(false);
    }

    return () => {
      selectionManager.setReadingMode(false);
      speechEngine.stop();
    };
  }, [selectedArticle]);

  const handleReadArticle = () => {
    if (!selectedArticle) return;
    setIsReadingAloud(true);
    speechEngine.speak(selectedArticle.content, () => {
      setIsReadingAloud(false);
    });
  };

  const handleStopReading = () => {
    speechEngine.stop();
    setIsReadingAloud(false);
  };

  return (
    <div
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '24px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      {/* Tab Switcher (News vs Videos) */}
      {!selectedArticle && !selectedVideo && (
        <div style={{ display: 'flex', gap: '16px' }}>
          <DwellButton
            id="tab-news"
            onClick={() => setActiveTab('news')}
            variant={activeTab === 'news' ? 'primary' : 'surface'}
            size="large"
            style={{ flex: 1 }}
            ariaLabel="Show News Articles"
          >
            <Newspaper size={24} />
            <span>News & Articles</span>
          </DwellButton>

          <DwellButton
            id="tab-videos"
            onClick={() => setActiveTab('videos')}
            variant={activeTab === 'videos' ? 'primary' : 'surface'}
            size="large"
            style={{ flex: 1 }}
            ariaLabel="Show Curated Videos"
          >
            <Video size={24} />
            <span>Watch Videos</span>
          </DwellButton>
        </div>
      )}

      {/* ARTICLE READING VIEW (Reading Mode Active) */}
      {selectedArticle && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Fixed Playback Controls Toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--surface)',
              padding: '16px 24px',
              borderRadius: 'var(--radius-lg)',
              border: '2px solid var(--border)',
            }}
          >
            <DwellButton
              id="article-btn-back"
              onClick={() => setSelectedArticle(null)}
              variant="sage"
              size="normal"
              ariaLabel="Back to headlines list"
            >
              <ArrowLeft size={20} />
              <span>Back to Articles</span>
            </DwellButton>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--primary)',
                  backgroundColor: 'var(--surface-sage)',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                Reading Mode Active (Buttons locked to protect your eyes)
              </span>

              {!isReadingAloud ? (
                <DwellButton
                  id="article-btn-read-aloud"
                  onClick={handleReadArticle}
                  variant="primary"
                  size="normal"
                  ariaLabel="Read article aloud"
                >
                  <Play size={20} />
                  <span>Read Aloud</span>
                </DwellButton>
              ) : (
                <DwellButton
                  id="article-btn-stop-reading"
                  onClick={handleStopReading}
                  variant="emergency"
                  size="normal"
                  ariaLabel="Stop reading aloud"
                >
                  <Square size={20} />
                  <span>Stop</span>
                </DwellButton>
              )}
            </div>
          </div>

          {/* Article Body: Selection Lockout Applied Here */}
          <article
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: 'var(--radius-lg)',
              border: '2px solid var(--border)',
              padding: '36px 40px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                {selectedArticle.source}
              </span>
              <a
                href={selectedArticle.url}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}
              >
                <span>Original Source</span>
                <ExternalLink size={14} />
              </a>
            </div>

            <h1 style={{ fontSize: 'var(--font-size-xl)', color: 'var(--text-primary)', lineHeight: 1.25 }}>
              {selectedArticle.title}
            </h1>

            <p
              style={{
                fontSize: '1.45rem',
                lineHeight: 1.8,
                color: 'var(--text-primary)',
                letterSpacing: '0.2px',
              }}
            >
              {selectedArticle.content}
            </p>
          </article>
        </div>
      )}

      {/* VIDEO PLAYER VIEW */}
      {selectedVideo && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <DwellButton
              id="video-btn-back"
              onClick={() => setSelectedVideo(null)}
              variant="sage"
              size="normal"
              ariaLabel="Back to video list"
            >
              <ArrowLeft size={20} />
              <span>Back to Videos</span>
            </DwellButton>
            <h2 style={{ fontSize: 'var(--font-size-md)', color: 'var(--text-primary)' }}>
              {selectedVideo.title}
            </h2>
          </div>

          <div
            style={{
              position: 'relative',
              width: '100%',
              paddingBottom: '56.25%', // 16:9 ratio
              backgroundColor: '#000',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              border: '2px solid var(--border)',
            }}
          >
            <iframe
              src={`${selectedVideo.embedUrl}?autoplay=1&rel=0`}
              title={selectedVideo.title}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 0,
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* NEWS LIST VIEW */}
      {activeTab === 'news' && !selectedArticle && !selectedVideo && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {SAMPLE_ARTICLES.map((art) => (
            <DwellButton
              key={art.id}
              id={`news-card-${art.id}`}
              onClick={() => setSelectedArticle(art)}
              variant="surface"
              size="large"
              style={{
                justifyContent: 'space-between',
                textAlign: 'left',
                minHeight: '100px',
                padding: '20px 28px',
              }}
              ariaLabel={`Read article: ${art.title}`}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase' }}>
                  {art.source}
                </span>
                <span style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {art.title}
                </span>
              </div>
              <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginLeft: '16px', flexShrink: 0 }}>
                Select to read →
              </span>
            </DwellButton>
          ))}
        </div>
      )}

      {/* VIDEOS LIST VIEW */}
      {activeTab === 'videos' && !selectedArticle && !selectedVideo && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {CURATED_VIDEOS.map((vid) => (
            <DwellButton
              key={vid.id}
              id={`video-card-${vid.id}`}
              onClick={() => setSelectedVideo(vid)}
              variant="surface"
              size="card"
              style={{
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                minHeight: '180px',
                padding: '24px',
              }}
              ariaLabel={`Watch video: ${vid.title}`}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--surface-blue)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#345E6A',
                }}
              >
                <Play size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: 'var(--font-size-md)', color: 'var(--text-primary)', fontWeight: 700 }}>
                  {vid.title}
                </h3>
                <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 400 }}>
                  {vid.description}
                </p>
              </div>
            </DwellButton>
          ))}
        </div>
      )}
    </div>
  );
};
