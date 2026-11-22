/**
 * NewsPage (/news)
 * Design 2: News Reader Focused
 * Full implementation of:
 * - Two-panel layout: Left headlines list + Right reading pane
 * - Legitimate India Today news integration
 * - 5-second initial settling delay
 * - Paragraph-by-paragraph speech synthesis with visual highlighting
 * - Synchronized auto-scrolling
 * - Full hands-free gaze controls: Pause, Stop, Next, Back, Repeat, Home, SOS
 */

import React, { useEffect, useState, useRef } from 'react';
import { DwellButton } from '../components/DwellButton';
import { IndiaTodayNewsService, IndiaTodayArticle } from '../services/IndiaTodayNewsService';
import { SpeechEngine } from '../speech/SpeechEngine';
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
} from 'lucide-react';

interface NewsPageProps {
  onNavigateHome: () => void;
}

export const NewsPage: React.FC<NewsPageProps> = ({ onNavigateHome }) => {
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

  // 1. Fetch Latest India Today Headlines on Mount
  useEffect(() => {
    IndiaTodayNewsService.getInstance().getLatestHeadlines().then((res) => {
      setArticles(res);
    });
  }, []);

  const currentArticle = articles[selectedArticleIndex] || null;

  // 2. Initial 5-Second Settling Period & Auto-Reading on Article Change
  useEffect(() => {
    if (!currentArticle) return;

    // Reset reading & scrolling state
    isCancelledRef.current = false;
    speechEngine.stop();
    setIsReading(false);
    setActiveParagraphIndex(null);
    setInitialDelayRemaining(5);

    // 5-second countdown timer
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
  }, [selectedArticleIndex, articles]);

  // 3. Sequential Paragraph Reading & Synchronized Scroll
  const startReadingFlow = (paraIndex: number) => {
    if (!currentArticle || paraIndex >= currentArticle.paragraphs.length || isCancelledRef.current) {
      setIsReading(false);
      setActiveParagraphIndex(null);
      return;
    }

    setIsReading(true);
    setActiveParagraphIndex(paraIndex);

    // Smoothly scroll active paragraph into view
    const pEl = paragraphRefs.current[paraIndex];
    if (pEl && articleContainerRef.current) {
      pEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const textToSpeak = currentArticle.paragraphs[paraIndex];
    speechEngine.speak(textToSpeak, () => {
      if (!isCancelledRef.current && !isAutoScrollPaused) {
        // Small 400ms pause between paragraphs before advancing
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
      // Resume
      setIsAutoScrollPaused(false);
      isCancelledRef.current = false;
      const nextIndex = activeParagraphIndex ?? 0;
      startReadingFlow(nextIndex);
    } else {
      // Pause
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

  const handleNextArticle = () => {
    if (selectedArticleIndex < articles.length - 1) {
      setSelectedArticleIndex(selectedArticleIndex + 1);
    } else {
      setSelectedArticleIndex(0);
    }
  };

  const handlePreviousArticle = () => {
    if (selectedArticleIndex > 0) {
      setSelectedArticleIndex(selectedArticleIndex - 1);
    } else {
      setSelectedArticleIndex(articles.length - 1);
    }
  };

  const handleRepeatParagraph = () => {
    if (activeParagraphIndex !== null) {
      isCancelledRef.current = false;
      startReadingFlow(activeParagraphIndex);
    } else {
      startReadingFlow(0);
    }
  };

  const handleManualScroll = (direction: 'up' | 'down') => {
    if (articleContainerRef.current) {
      const delta = direction === 'up' ? -250 : 250;
      articleContainerRef.current.scrollBy({ top: delta, behavior: 'smooth' });
    }
  };

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
        gap: '16px',
        height: 'calc(100vh - 90px)',
      }}
    >
      {/* ========================================================================= */}
      {/* 2-PANEL LAYOUT: LEFT HEADLINES LIST + RIGHT ARTICLE PANE                  */}
      {/* ========================================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '380px 1fr',
          gap: '24px',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        {/* LEFT PANEL: Today's Headlines List */}
        <aside
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-lg)',
            border: '2px solid var(--border)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: 'var(--shadow-card)',
            overflow: 'hidden',
          }}
          aria-label="Today's Headlines"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Newspaper size={22} color="#DC2626" />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Today's Headlines
              </h2>
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#DC2626', backgroundColor: '#FEF2F2', padding: '3px 8px', borderRadius: 'var(--radius-full)' }}>
              India Today
            </span>
          </div>

          {/* Scrollable Headlines List */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              overflowY: 'auto',
              paddingRight: '4px',
            }}
          >
            {articles.map((art, index) => {
              const isSelected = index === selectedArticleIndex;
              return (
                <DwellButton
                  key={art.id}
                  id={`news-headline-item-${art.id}`}
                  onClick={() => setSelectedArticleIndex(index)}
                  variant={isSelected ? 'primary' : 'surface'}
                  size="normal"
                  ariaLabel={`Select headline: ${art.title}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '12px',
                    minHeight: '84px',
                    textAlign: 'left',
                    borderRadius: 'var(--radius-md)',
                    border: isSelected ? '2px solid var(--gaze-blue)' : '1px solid var(--border)',
                    boxShadow: isSelected ? 'var(--shadow-blue-glow)' : 'var(--shadow-subtle)',
                  }}
                >
                  <div
                    style={{
                      width: '64px',
                      height: '60px',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      flexShrink: 0,
                      backgroundColor: '#0F172A',
                    }}
                  >
                    <img
                      src={art.imageUrl}
                      alt="Thumbnail"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        fontSize: '0.92rem',
                        fontWeight: 700,
                        color: isSelected ? '#FFFFFF' : 'var(--text-primary)',
                        lineHeight: 1.25,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {art.title}
                    </div>
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: isSelected ? '#DBEAFE' : 'var(--text-muted)',
                        fontWeight: 500,
                      }}
                    >
                      India Today • {art.publishedTime}
                    </div>
                  </div>
                </DwellButton>
              );
            })}
          </div>
        </aside>

        {/* RIGHT MAIN PANEL: Active Article Reading Pane */}
        {currentArticle && (
          <main
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-lg)',
              border: '2px solid var(--border)',
              padding: '24px 32px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-card)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* Countdown / Reading Status Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--border)',
                paddingBottom: '14px',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#DC2626', textTransform: 'uppercase' }}>
                  {currentArticle.source} • {currentArticle.category}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>•</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {currentArticle.publishedDate} ({currentArticle.publishedTime})
                </span>
              </div>

              {/* 5-Second Delay Indicator */}
              {initialDelayRemaining > 0 ? (
                <div
                  style={{
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    color: '#2563EB',
                    padding: '4px 14px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                  }}
                >
                  Reading aloud in {initialDelayRemaining}s...
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: isReading ? '#F0FDF4' : '#F8FAFC',
                    border: isReading ? '1px solid #BBF7D0' : '1px solid var(--border)',
                    color: isReading ? '#16A34A' : 'var(--text-secondary)',
                    padding: '4px 14px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                  }}
                >
                  {isReading
                    ? isAutoScrollPaused
                      ? 'Reading Paused'
                      : 'Reading Aloud & Synchronizing'
                    : 'Reading Stopped'}
                </div>
              )}
            </div>

            {/* Scrollable Article Text Container */}
            <div
              ref={articleContainerRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                paddingRight: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              }}
            >
              <h1
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  lineHeight: 1.3,
                  margin: 0,
                }}
              >
                {currentArticle.title}
              </h1>

              {/* Hero Image */}
              <div
                style={{
                  width: '100%',
                  height: '240px',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  backgroundColor: '#0F172A',
                }}
              >
                <img
                  src={currentArticle.imageUrl}
                  alt={currentArticle.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              {/* Article Paragraphs with Active Synchronized Highlight */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {currentArticle.paragraphs.map((para, idx) => {
                  const isActive = idx === activeParagraphIndex;
                  return (
                    <p
                      key={idx}
                      ref={(el) => (paragraphRefs.current[idx] = el)}
                      style={{
                        fontSize: '1.3rem',
                        lineHeight: 1.8,
                        color: 'var(--text-primary)',
                        padding: '12px 18px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: isActive ? '#EFF6FF' : 'transparent',
                        borderLeft: isActive ? '5px solid var(--gaze-blue)' : '5px solid transparent',
                        boxShadow: isActive ? '0 2px 8px rgba(0, 136, 255, 0.12)' : 'none',
                        transition: 'all 200ms ease',
                        margin: 0,
                      }}
                    >
                      {para}
                    </p>
                  );
                })}
              </div>

              <div style={{ padding: '16px 0', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                <a
                  href={currentArticle.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: 'var(--secondary)',
                  }}
                >
                  <span>Open on IndiaToday.in</span>
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>
          </main>
        )}
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM CONTROLS BAR: MATCHING REFERENCE DESIGN 2                         */}
      {/* ========================================================================= */}
      <footer
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-lg)',
          border: '2px solid var(--border)',
          padding: '12px 24px',
          boxShadow: 'var(--shadow-card)',
          gap: '14px',
          flexWrap: 'wrap',
        }}
      >
        {/* Navigation Actions */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <DwellButton
            id="news-btn-home"
            onClick={onNavigateHome}
            variant="sage"
            size="normal"
            ariaLabel="Return to Home Dashboard"
            style={{ minHeight: '52px', padding: '10px 18px' }}
          >
            <Home size={20} />
            <span>Home</span>
          </DwellButton>

          <DwellButton
            id="news-btn-prev-article"
            onClick={handlePreviousArticle}
            variant="surface"
            size="normal"
            ariaLabel="Previous India Today article"
            style={{ minHeight: '52px', padding: '10px 18px' }}
          >
            <ArrowLeft size={20} />
            <span>Back Article</span>
          </DwellButton>

          <DwellButton
            id="news-btn-next-article"
            onClick={handleNextArticle}
            variant="surface"
            size="normal"
            ariaLabel="Next India Today article"
            style={{ minHeight: '52px', padding: '10px 18px' }}
          >
            <span>Next Article</span>
            <ArrowRight size={20} />
          </DwellButton>
        </div>

        {/* Reading & Scrolling Controls */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <DwellButton
            id="news-btn-pause-scroll"
            onClick={handleTogglePause}
            variant={isAutoScrollPaused ? 'primary' : 'surface'}
            size="normal"
            ariaLabel={isAutoScrollPaused ? 'Resume automatic scrolling and reading' : 'Pause automatic scrolling and reading'}
            style={{ minHeight: '52px', padding: '10px 18px' }}
          >
            {isAutoScrollPaused ? <Play size={20} /> : <Pause size={20} />}
            <span>{isAutoScrollPaused ? 'Resume Scroll' : 'Pause Scroll'}</span>
          </DwellButton>

          <DwellButton
            id="news-btn-stop-reading"
            onClick={handleStopReading}
            disabled={!isReading && isAutoScrollPaused}
            variant="ghost"
            size="normal"
            ariaLabel="Stop reading and reset"
            style={{ minHeight: '52px', padding: '10px 18px' }}
          >
            <Square size={18} />
            <span>Stop Reading</span>
          </DwellButton>

          <DwellButton
            id="news-btn-repeat-paragraph"
            onClick={handleRepeatParagraph}
            variant="ghost"
            size="normal"
            ariaLabel="Repeat currently selected paragraph"
            style={{ minHeight: '52px', padding: '10px 16px' }}
          >
            <RotateCcw size={18} />
            <span>Repeat</span>
          </DwellButton>

          {/* Manual Scroll Buttons */}
          <DwellButton
            id="news-btn-scroll-up"
            onClick={() => handleManualScroll('up')}
            variant="ghost"
            size="normal"
            ariaLabel="Scroll text up"
            style={{ minHeight: '52px', padding: '10px 12px' }}
          >
            <ChevronUp size={22} />
          </DwellButton>

          <DwellButton
            id="news-btn-scroll-down"
            onClick={() => handleManualScroll('down')}
            variant="ghost"
            size="normal"
            ariaLabel="Scroll text down"
            style={{ minHeight: '52px', padding: '10px 12px' }}
          >
            <ChevronDown size={22} />
          </DwellButton>
        </div>
      </footer>
    </div>
  );
};
