/**
 * NewsPage — Indian News Websites & Accessible Reader
 *
 * Supports:
 * 1. Live Websites Mode (Default): Direct 1-dwell launchers for India Today,
 *    NDTV, Times of India, The Indian Express, The Hindu, Hindustan Times, Aaj Tak,
 *    opening the real website in a centered standalone window matching user's UI screenshot.
 *
 * 2. Accessible Audio Reader: Hands-free paragraph-by-paragraph speech reading
 *    with synchronized auto-scroll and dwell controls.
 */

import React, { useEffect, useState, useRef } from 'react';
import { DwellButton } from '../components/DwellButton';
import { IndiaTodayNewsService, IndiaTodayArticle } from '../services/IndiaTodayNewsService';
import { SpeechEngine } from '../speech/SpeechEngine';
import { openAppWindow } from '../utils/windowLauncher';
import {
  Newspaper,
  Play,
  Pause,
  Square,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Home,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Globe,
  Headphones,
  Sparkles,
} from 'lucide-react';

interface NewsPageProps {
  onNavigateHome: () => void;
}

interface NewsSource {
  id: string;
  name: string;
  url: string;
  category: string;
  description: string;
  color: string;
  badge: string;
}

const INDIAN_NEWS_SOURCES: NewsSource[] = [
  {
    id: 'news-india-today',
    name: 'India Today',
    url: 'https://www.indiatoday.in',
    category: 'National & World',
    description: 'Breaking news, in-depth reports, politics & tech',
    color: '#DC2626',
    badge: 'Popular',
  },
  {
    id: 'news-ndtv',
    name: 'NDTV News',
    url: 'https://www.ndtv.com',
    category: 'National & Video',
    description: 'Latest headlines, analysis, live video streams',
    color: '#B91C1C',
    badge: 'Live News',
  },
  {
    id: 'news-indian-express',
    name: 'The Indian Express',
    url: 'https://indianexpress.com',
    category: 'Analysis & Journalism',
    description: 'Investigative journalism, opinion & editorial',
    color: '#C2410C',
    badge: 'In-Depth',
  },
  {
    id: 'news-times-of-india',
    name: 'Times of India',
    url: 'https://timesofindia.indiatimes.com',
    category: 'National & Cities',
    description: 'City updates, national coverage & entertainment',
    color: '#0284C7',
    badge: 'Top Reach',
  },
  {
    id: 'news-the-hindu',
    name: 'The Hindu',
    url: 'https://www.thehindu.com',
    category: 'National & Editorial',
    description: 'Balanced national reporting, policy & culture',
    color: '#1E3A8A',
    badge: 'Editorial',
  },
  {
    id: 'news-hindustan-times',
    name: 'Hindustan Times',
    url: 'https://www.hindustantimes.com',
    category: 'National & World',
    description: 'Latest Indian news, cricket, economy & lifestyle',
    color: '#0D9488',
    badge: 'Daily',
  },
  {
    id: 'news-aaj-tak',
    name: 'Aaj Tak (Hindi)',
    url: 'https://www.aajtak.in',
    category: 'Hindi News',
    description: 'India’s most watched Hindi news network',
    color: '#E11D48',
    badge: 'Hindi',
  },
  {
    id: 'news-economic-times',
    name: 'The Economic Times',
    url: 'https://economictimes.indiatimes.com',
    category: 'Business & Finance',
    description: 'Stock markets, corporate India & economy',
    color: '#7C3AED',
    badge: 'Markets',
  },
  {
    id: 'news-bbc-india',
    name: 'BBC News India',
    url: 'https://www.bbc.com/news/world/asia/india',
    category: 'Global Perspective',
    description: 'International reporting and features on India',
    color: '#B91C1C',
    badge: 'Global',
  },
];

export const NewsPage: React.FC<NewsPageProps> = ({ onNavigateHome }) => {
  const [activeTab, setActiveTab] = useState<'websites' | 'audio-reader'>('websites');
  const [lastOpenedWebsite, setLastOpenedWebsite] = useState<string | null>(null);

  // Audio Reader state
  const [articles, setArticles] = useState<IndiaTodayArticle[]>([]);
  const [selectedArticleIndex, setSelectedArticleIndex] = useState(0);
  const [isReading, setIsReading] = useState(false);
  const [isAutoScrollPaused, setIsAutoScrollPaused] = useState(false);
  const [activeParagraphIndex, setActiveParagraphIndex] = useState<number | null>(null);
  const [initialDelayRemaining, setInitialDelayRemaining] = useState<number>(5);

  const speechEngine = SpeechEngine.getInstance();
  const articleContainerRef = useRef<HTMLDivElement>(null);
  const paragraphRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const delayTimerRef = useRef<any>(null);
  const isCancelledRef = useRef(false);

  // Open external website window
  const handleOpenWebsite = (url: string, name: string) => {
    openAppWindow(url, 'NewsWebsiteWindow');
    setLastOpenedWebsite(name);
  };

  // Fetch articles on mount
  useEffect(() => {
    IndiaTodayNewsService.getInstance().getLatestHeadlines().then((res) => {
      setArticles(res);
    });
  }, []);

  const currentArticle = articles[selectedArticleIndex] || null;

  // Reading loop when in audio-reader tab
  useEffect(() => {
    if (activeTab !== 'audio-reader' || !currentArticle) return;

    isCancelledRef.current = false;
    speechEngine.stop();
    setIsReading(false);
    setActiveParagraphIndex(null);
    setInitialDelayRemaining(5);

    let count = 5;
    if (delayTimerRef.current) clearInterval(delayTimerRef.current);

    delayTimerRef.current = setInterval(() => {
      count--;
      setInitialDelayRemaining(count);
      if (count <= 0) {
        clearInterval(delayTimerRef.current);
        startReadingFlow(0);
      }
    }, 1000);

    return () => {
      if (delayTimerRef.current) clearInterval(delayTimerRef.current);
      speechEngine.stop();
    };
  }, [selectedArticleIndex, articles, activeTab]);

  const startReadingFlow = (paraIndex: number) => {
    if (!currentArticle || paraIndex >= currentArticle.paragraphs.length || isCancelledRef.current) {
      setIsReading(false);
      setActiveParagraphIndex(null);
      return;
    }

    setIsReading(true);
    setActiveParagraphIndex(paraIndex);

    const pEl = paragraphRefs.current[paraIndex];
    if (pEl && articleContainerRef.current) {
      pEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const textToSpeak = currentArticle.paragraphs[paraIndex];
    speechEngine.speak(textToSpeak, () => {
      if (!isCancelledRef.current && !isAutoScrollPaused) {
        setTimeout(() => {
          if (!isCancelledRef.current && !isAutoScrollPaused) {
            startReadingFlow(paraIndex + 1);
          }
        }, 400);
      }
    });
  };

  const handleTogglePause = () => {
    if (isAutoScrollPaused) {
      setIsAutoScrollPaused(false);
      isCancelledRef.current = false;
      const nextIndex = activeParagraphIndex ?? 0;
      startReadingFlow(nextIndex);
    } else {
      setIsAutoScrollPaused(true);
      speechEngine.stop();
    }
  };

  const handleStopReading = () => {
    isCancelledRef.current = true;
    if (delayTimerRef.current) clearInterval(delayTimerRef.current);
    speechEngine.stop();
    setIsReading(false);
    setIsAutoScrollPaused(true);
    setInitialDelayRemaining(0);
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
      {/* Top Header */}
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
              backgroundColor: '#EFF6FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1D4ED8',
            }}
          >
            <Newspaper size={24} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)', lineHeight: 1.1 }}>
              Indian News Hub
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Real live websites & hands-free auto reader
            </div>
          </div>
        </div>

        {/* Tab Switcher & Navigation */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <DwellButton
            id="tab-news-websites"
            onClick={() => setActiveTab('websites')}
            variant={activeTab === 'websites' ? 'primary' : 'surface'}
            size="normal"
            ariaLabel="Show Indian News Websites launcher"
            style={{ minHeight: '42px', padding: '6px 16px', fontSize: '0.92rem' }}
          >
            <Globe size={17} />
            <span>Live Websites</span>
          </DwellButton>

          <DwellButton
            id="tab-news-audio-reader"
            onClick={() => setActiveTab('audio-reader')}
            variant={activeTab === 'audio-reader' ? 'primary' : 'surface'}
            size="normal"
            ariaLabel="Switch to Hands-Free Audio Reader"
            style={{ minHeight: '42px', padding: '6px 16px', fontSize: '0.92rem' }}
          >
            <Headphones size={17} />
            <span>Audio Reader</span>
          </DwellButton>

          <DwellButton
            id="news-btn-home"
            onClick={onNavigateHome}
            variant="sage"
            size="normal"
            ariaLabel="Return to Home Dashboard"
            style={{ minHeight: '42px', padding: '6px 16px', fontSize: '0.92rem' }}
          >
            <Home size={17} />
            <span>Home</span>
          </DwellButton>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: LIVE INDIAN NEWS WEBSITES LAUNCHER                                */}
      {/* ========================================================================= */}
      {activeTab === 'websites' && (
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
          {/* Giant Hero Launcher for India Today */}
          <DwellButton
            id="news-open-india-today-hero"
            onClick={() => handleOpenWebsite('https://www.indiatoday.in', 'India Today')}
            variant="primary"
            size="large"
            showCenterRing={true}
            ariaLabel="Launch Real India Today Website in Window"
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
              background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
              boxShadow: '0 8px 24px rgba(220, 38, 38, 0.25)',
              border: 'none',
            }}
          >
            <Newspaper size={44} color="#FFFFFF" />
            <div style={{ textAlign: 'left' }}>
              <div>Launch India Today Website</div>
              <div style={{ fontSize: '0.92rem', fontWeight: 500, color: 'rgba(255,255,255,0.85)', marginTop: '4px' }}>
                Opens the real indiatoday.in website in a standalone popup window over EyeControl
              </div>
            </div>
            <ExternalLink size={26} color="#FFFFFF" style={{ marginLeft: '12px' }} />
          </DwellButton>

          {/* Grid of Leading Indian News Publishers */}
          <div>
            <div
              style={{
                fontSize: '0.9rem',
                fontWeight: 800,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Sparkles size={16} color="var(--secondary)" />
              <span>Select Any Indian News Website</span>
              {lastOpenedWebsite && (
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: '0.85rem',
                    color: '#16A34A',
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    padding: '4px 12px',
                    borderRadius: '99px',
                    fontWeight: 700,
                  }}
                >
                  ✓ Window Active: {lastOpenedWebsite}
                </span>
              )}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '14px',
              }}
            >
              {INDIAN_NEWS_SOURCES.map((source) => (
                <DwellButton
                  key={source.id}
                  id={source.id}
                  onClick={() => handleOpenWebsite(source.url, source.name)}
                  variant="surface"
                  size="normal"
                  ariaLabel={`Open ${source.name} in window`}
                  style={{
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '18px 20px',
                    minHeight: '110px',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: '1.15rem', fontWeight: 800, color: source.color }}>
                      {source.name}
                    </span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: '#F1F5F9',
                        color: 'var(--text-secondary)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                      }}
                    >
                      {source.badge}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    {source.description}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--secondary)', fontWeight: 600, marginTop: 'auto' }}>
                    <span>Open website</span>
                    <ExternalLink size={13} />
                  </div>
                </DwellButton>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: ACCESSIBLE AUDIO READER WITH SYNCHRONIZED TTS                     */}
      {/* ========================================================================= */}
      {activeTab === 'audio-reader' && (
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: '360px 1fr',
            gap: '20px',
            padding: '20px 24px',
            overflow: 'hidden',
          }}
        >
          {/* Left: Headlines List */}
          <aside
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              overflow: 'hidden',
            }}
          >
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              India Today RSS Headlines
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
              {articles.map((art, idx) => {
                const isSelected = idx === selectedArticleIndex;
                return (
                  <DwellButton
                    key={art.id}
                    id={`rss-item-${art.id}`}
                    onClick={() => setSelectedArticleIndex(idx)}
                    variant={isSelected ? 'primary' : 'surface'}
                    size="normal"
                    ariaLabel={`Read: ${art.title}`}
                    style={{
                      padding: '12px',
                      textAlign: 'left',
                      minHeight: '74px',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: '4px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        color: isSelected ? '#FFFFFF' : 'var(--text-primary)',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {art.title}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: isSelected ? '#DBEAFE' : 'var(--text-muted)' }}>
                      {art.publishedTime}
                    </div>
                  </DwellButton>
                );
              })}
            </div>
          </aside>

          {/* Right: Article Reading Pane */}
          {currentArticle && (
            <main
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
                padding: '20px 28px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#DC2626' }}>
                  {currentArticle.source} • {currentArticle.category}
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#16A34A' }}>
                  {initialDelayRemaining > 0 ? `Reading in ${initialDelayRemaining}s...` : isReading ? 'Reading Aloud' : 'Stopped'}
                </span>
              </div>

              <div ref={articleContainerRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {currentArticle.title}
                </h1>
                {currentArticle.paragraphs.map((para, pIdx) => {
                  const isActive = pIdx === activeParagraphIndex;
                  return (
                    <p
                      key={pIdx}
                      ref={(el) => (paragraphRefs.current[pIdx] = el)}
                      style={{
                        fontSize: '1.15rem',
                        lineHeight: 1.7,
                        color: 'var(--text-primary)',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: isActive ? '#EFF6FF' : 'transparent',
                        borderLeft: isActive ? '4px solid var(--gaze-blue)' : '4px solid transparent',
                        margin: 0,
                      }}
                    >
                      {para}
                    </p>
                  );
                })}
              </div>

              {/* Controls bar */}
              <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '12px' }}>
                <DwellButton
                  id="reader-btn-pause"
                  onClick={handleTogglePause}
                  variant={isAutoScrollPaused ? 'primary' : 'surface'}
                  size="normal"
                  ariaLabel="Toggle reading pause"
                  style={{ minHeight: '44px', padding: '8px 18px', fontSize: '0.9rem' }}
                >
                  {isAutoScrollPaused ? <Play size={16} /> : <Pause size={16} />}
                  <span>{isAutoScrollPaused ? 'Resume' : 'Pause'}</span>
                </DwellButton>

                <DwellButton
                  id="reader-btn-stop"
                  onClick={handleStopReading}
                  variant="ghost"
                  size="normal"
                  ariaLabel="Stop reading"
                  style={{ minHeight: '44px', padding: '8px 18px', fontSize: '0.9rem' }}
                >
                  <Square size={16} />
                  <span>Stop</span>
                </DwellButton>
              </div>
            </main>
          )}
        </div>
      )}
    </div>
  );
};
