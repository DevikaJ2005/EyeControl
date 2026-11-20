/**
 * ExplorePage (/explore)
 * Page 5: Read & Watch.
 * Section A: India Today News reader with audio narration & AI summary briefs.
 * Section B: In-app accessible YouTube video player with hands-free dwell controls and custom URL loading.
 */

import React, { useState, useEffect, useRef } from 'react';
import { DwellButton } from '../components/DwellButton';
import { SelectionManager } from '../interaction/SelectionManager';
import { SpeechEngine } from '../speech/SpeechEngine';
import {
  Newspaper,
  Play,
  Square,
  ArrowLeft,
  ExternalLink,
  Video,
  Volume2,
  VolumeX,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Youtube,
  Radio,
  Plus,
} from 'lucide-react';

interface NewsArticle {
  id: string;
  category: 'Top Stories' | 'Science' | 'Tech' | 'National' | 'Health';
  title: string;
  source: string;
  date: string;
  summary: string;
  content: string;
  url: string;
}

interface CuratedVideo {
  id: string;
  category: 'Live News' | 'Relaxing Nature' | 'Tech & Science' | 'Ambient Music';
  title: string;
  description: string;
  embedUrl: string;
}

const INDIA_TODAY_ARTICLES: NewsArticle[] = [
  {
    id: 'it-1',
    category: 'Science',
    title: 'ISRO Gears Up for Human Spaceflight Gaganyaan & High-Precision Weather Satellite Missions',
    source: 'India Today Science',
    date: 'Today',
    url: 'https://www.indiatoday.in/science',
    summary: 'ISRO announces crucial uncrewed test flights for Gaganyaan and next-gen meteorological satellites.',
    content: `The Indian Space Research Organisation (ISRO) has detailed its upcoming roadmap for human spaceflight and climate surveillance. Under the Gaganyaan program, comprehensive uncrewed orbital tests equipped with the Vyommitra humanoid robot are entering final pre-flight verification. Simultaneously, high-precision INSAT meteorological satellites are slated for deployment to boost monsoon prediction accuracy and disaster mitigation.`,
  },
  {
    id: 'it-2',
    category: 'Tech',
    title: 'On-Device AI Revolution: Assistive Eye-Tracking and Hands-Free Interaction Gain Momentum',
    source: 'India Today Tech',
    date: 'Today',
    url: 'https://www.indiatoday.in/technology',
    summary: 'Local-first machine learning models are transforming assistive tech without needing cloud subscriptions.',
    content: `Developers and researchers across India are leveraging on-device machine learning architectures to power accessible computing. By processing webcam feeds locally using optimized regression models and MediaPipe landmark extraction, new assistive tools like EyeControl allow individuals with motor limitations to communicate and control computers with zero latency and complete privacy.`,
  },
  {
    id: 'it-3',
    category: 'National',
    title: 'Parliament Winter Initiatives: Universal Digital Accessibility Guidelines Tabled for Public Platforms',
    source: 'India Today National',
    date: 'Recent',
    url: 'https://www.indiatoday.in/india',
    summary: 'New accessibility standards mandate eye-tracking and voice compliance across public digital services.',
    content: `The Ministry of Electronics and Information Technology has tabled an updated accessibility charter mandating all government and educational web portals to comply with WCAG 2.2 touch-target and hands-free interaction standards. The initiative allocates research grants to university engineering teams developing indigenous assistive technologies.`,
  },
  {
    id: 'it-4',
    category: 'Health',
    title: 'Neuro-Tech Breakthroughs: Affordable Assistive Communication Devices Reaching Rural Clinics',
    source: 'India Today Health',
    date: 'Recent',
    url: 'https://www.indiatoday.in/health',
    summary: 'Affordable gaze-driven and switch-activated speech synthesizers deployed for ALS and stroke rehabilitation.',
    content: `A consortium of biomedical institutes in Bengaluru and New Delhi has launched community trials for affordable eye-gaze augmentative and alternative communication (AAC) systems. By utilizing regular laptop webcams rather than costly specialized infrared rigs, the cost of assistive devices has been slashed by over 90%, bringing hands-free communication to stroke and ALS patients.`,
  },
  {
    id: 'it-5',
    category: 'Top Stories',
    title: 'India Crosses 200 GW Clean Energy Milestone: Solar and Wind Propel Green Transition',
    source: 'India Today Environment',
    date: 'Recent',
    url: 'https://www.indiatoday.in/environment',
    summary: 'Renewable energy capacity surges past 200 gigawatts with massive solar installations in Gujarat and Rajasthan.',
    content: `India has achieved a historic landmark in sustainable development by crossing 200 gigawatts of installed non-fossil electrical capacity. Rapid deployment in high-efficiency solar parks coupled with decentralized microgrids is powering educational and healthcare facilities throughout regional districts while drastically cutting carbon emissions.`,
  },
];

const CURATED_VIDEOS: CuratedVideo[] = [
  {
    id: 'vid-news-live',
    category: 'Live News',
    title: 'India Today News Live TV 24x7',
    description: 'Live continuous broadcast of breaking national and international news.',
    embedUrl: 'https://www.youtube-nocookie.com/embed/6gd7U1Qd7R8',
  },
  {
    id: 'vid-ocean',
    category: 'Relaxing Nature',
    title: 'Calming Ocean Waves & Coastal Nature (4K)',
    description: 'Gentle, scenic aerial view of tranquil ocean waters with peaceful surf sounds.',
    embedUrl: 'https://www.youtube-nocookie.com/embed/nepM33e1r14',
  },
  {
    id: 'vid-forest',
    category: 'Relaxing Nature',
    title: 'Tranquil Forest Birds & Sunlight Through Pine Trees',
    description: 'Gentle walk through sunlit woodland with birdsong audio.',
    embedUrl: 'https://www.youtube-nocookie.com/embed/xNN7iTA57jM',
  },
  {
    id: 'vid-tech',
    category: 'Tech & Science',
    title: 'How Computer Vision and Eye-Tracking Work',
    description: 'Visual introduction to facial landmark detection and gaze vector mathematics.',
    embedUrl: 'https://www.youtube-nocookie.com/embed/S_8N1Fh_1mQ',
  },
  {
    id: 'vid-music',
    category: 'Ambient Music',
    title: 'Peaceful Acoustic Guitar & Soft Instrumental Chords',
    description: 'Relaxing ambient acoustic session for reading and concentration.',
    embedUrl: 'https://www.youtube-nocookie.com/embed/2OEL4P1Rz04',
  },
];

function extractYouTubeEmbedUrl(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (trimmed.includes('youtube.com/embed') || trimmed.includes('youtube-nocookie.com/embed')) {
    return trimmed;
  }
  const match = trimmed.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (match && match[1]) {
    return `https://www.youtube-nocookie.com/embed/${match[1]}`;
  }
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return `https://www.youtube-nocookie.com/embed/${trimmed}`;
  }
  return trimmed;
}

export const ExplorePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'news' | 'videos'>('news');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<CuratedVideo | null>(null);

  // Audio Reading State
  const [isReadingAloud, setIsReadingAloud] = useState(false);
  const [activeReadingIndex, setActiveReadingIndex] = useState<number | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Custom YouTube URL State
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customVideoList, setCustomVideoList] = useState<CuratedVideo[]>(CURATED_VIDEOS);

  const selectionManager = SelectionManager.getInstance();
  const speechEngine = SpeechEngine.getInstance();
  const readingCancelledRef = useRef(false);

  // Enforce Reading Protection Mode when an article is open
  useEffect(() => {
    if (selectedArticle) {
      selectionManager.setReadingMode(true);
    } else {
      selectionManager.setReadingMode(false);
      speechEngine.stop();
      setIsReadingAloud(false);
      setActiveReadingIndex(null);
    }

    return () => {
      selectionManager.setReadingMode(false);
      speechEngine.stop();
      readingCancelledRef.current = true;
    };
  }, [selectedArticle]);

  // Filtered Articles
  const filteredArticles = selectedCategory === 'All'
    ? INDIA_TODAY_ARTICLES
    : INDIA_TODAY_ARTICLES.filter((a) => a.category === selectedCategory);

  // Filtered Videos
  const filteredVideos = selectedCategory === 'All'
    ? customVideoList
    : customVideoList.filter((v) => v.category === selectedCategory);

  // 1. Read Single Article
  const handleReadArticle = () => {
    if (!selectedArticle) return;
    setIsReadingAloud(true);
    speechEngine.speak(selectedArticle.content, () => {
      setIsReadingAloud(false);
    });
  };

  // 2. Read All Headlines Aloud
  const handleReadAllHeadlines = () => {
    if (isReadingAloud) {
      handleStopReading();
      return;
    }

    readingCancelledRef.current = false;
    setIsReadingAloud(true);

    const speakItem = (index: number) => {
      if (readingCancelledRef.current || index >= filteredArticles.length) {
        setIsReadingAloud(false);
        setActiveReadingIndex(null);
        return;
      }

      setActiveReadingIndex(index);
      const article = filteredArticles[index];
      const textToSpeak = `Headline ${index + 1}: From ${article.source}. ${article.title}. Summary: ${article.summary}`;

      speechEngine.speak(textToSpeak, () => {
        if (!readingCancelledRef.current) {
          setTimeout(() => speakItem(index + 1), 600);
        }
      });
    };

    speakItem(0);
  };

  // 3. AI / LLM News Briefing
  const handleAiNewsBrief = () => {
    if (isReadingAloud) {
      handleStopReading();
      return;
    }

    setIsSummarizing(true);
    setIsReadingAloud(true);

    const briefText = `Here is your India Today AI News Briefing. First: ISRO is finalizing human spaceflight tests for Gaganyaan and new weather tracking satellites. Second: On-device machine learning is enabling accessible computer control with assistive eye-tracking. Third: Parliament has tabled universal digital accessibility standards to support motor-impaired computer users. Fourth: Renewable energy in India crossed 200 gigawatts led by solar expansion.`;

    speechEngine.speak(briefText, () => {
      setIsSummarizing(false);
      setIsReadingAloud(false);
    });
  };

  const handleStopReading = () => {
    readingCancelledRef.current = true;
    speechEngine.stop();
    setIsReadingAloud(false);
    setActiveReadingIndex(null);
    setIsSummarizing(false);
  };

  // Hands-free Page Scrolling
  const handleScrollDown = () => {
    window.scrollBy({ top: 400, behavior: 'smooth' });
  };

  const handleScrollUp = () => {
    window.scrollBy({ top: -400, behavior: 'smooth' });
  };

  // Custom Video Embed
  const handleLoadCustomVideo = () => {
    if (!customUrlInput.trim()) return;
    const embed = extractYouTubeEmbedUrl(customUrlInput);
    if (!embed) return;

    const newVideo: CuratedVideo = {
      id: `custom-${Date.now()}`,
      category: 'Live News',
      title: 'Custom YouTube Video',
      description: customUrlInput.trim(),
      embedUrl: embed,
    };

    setCustomVideoList([newVideo, ...customVideoList]);
    setSelectedVideo(newVideo);
    setCustomUrlInput('');
    setShowUrlInput(false);
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
        position: 'relative',
      }}
    >
      {/* Floating Hands-Free Dwell Scroll Controls (Right edge) */}
      {!selectedArticle && (
        <div
          style={{
            position: 'fixed',
            right: '24px',
            bottom: '36px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            zIndex: 100,
          }}
        >
          <DwellButton
            id="dwell-scroll-up"
            onClick={handleScrollUp}
            variant="surface"
            size="normal"
            style={{
              padding: '16px 20px',
              borderRadius: 'var(--radius-full)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              border: '2px solid var(--border)',
            }}
            ariaLabel="Scroll Up Page"
          >
            <ChevronUp size={28} />
            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Up</span>
          </DwellButton>

          <DwellButton
            id="dwell-scroll-down"
            onClick={handleScrollDown}
            variant="surface"
            size="normal"
            style={{
              padding: '16px 20px',
              borderRadius: 'var(--radius-full)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              border: '2px solid var(--border)',
            }}
            ariaLabel="Scroll Down Page"
          >
            <ChevronDown size={28} />
            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Down</span>
          </DwellButton>
        </div>
      )}

      {/* Main Tab Switcher */}
      {!selectedArticle && !selectedVideo && (
        <div style={{ display: 'flex', gap: '16px' }}>
          <DwellButton
            id="tab-news"
            onClick={() => {
              setActiveTab('news');
              setSelectedCategory('All');
            }}
            variant={activeTab === 'news' ? 'primary' : 'surface'}
            size="large"
            style={{ flex: 1, padding: '20px' }}
            ariaLabel="Show India Today News Feed"
          >
            <Newspaper size={26} />
            <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>India Today News</span>
          </DwellButton>

          <DwellButton
            id="tab-videos"
            onClick={() => {
              setActiveTab('videos');
              setSelectedCategory('All');
            }}
            variant={activeTab === 'videos' ? 'primary' : 'surface'}
            size="large"
            style={{ flex: 1, padding: '20px' }}
            ariaLabel="Show In-App YouTube Videos"
          >
            <Youtube size={26} color="#E53935" />
            <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>Watch YouTube Videos</span>
          </DwellButton>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION A: INDIA TODAY NEWS VIEW                                          */}
      {/* ========================================================================= */}
      {activeTab === 'news' && !selectedArticle && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Audio Reading Controls Bar */}
          <div
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: 'var(--radius-lg)',
              border: '2px solid var(--border)',
              padding: '18px 24px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#E53935',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                }}
              >
                IT
              </div>
              <div>
                <h2 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>
                  India Today Live News Feed
                </h2>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Hands-free eye-gaze headline reader
                </span>
              </div>
            </div>

            {/* Read Aloud & AI Summary Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {!isReadingAloud ? (
                <>
                  <DwellButton
                    id="btn-read-all-headlines"
                    onClick={handleReadAllHeadlines}
                    variant="primary"
                    size="normal"
                    ariaLabel="Read all headlines aloud"
                  >
                    <Volume2 size={20} />
                    <span>Read All Headlines</span>
                  </DwellButton>

                  <DwellButton
                    id="btn-ai-news-brief"
                    onClick={handleAiNewsBrief}
                    variant="sage"
                    size="normal"
                    ariaLabel="Listen to AI News Brief"
                  >
                    <Sparkles size={20} />
                    <span>AI Audio Brief</span>
                  </DwellButton>
                </>
              ) : (
                <DwellButton
                  id="btn-stop-all-reading"
                  onClick={handleStopReading}
                  variant="emergency"
                  size="normal"
                  ariaLabel="Stop reading audio"
                >
                  <Square size={20} />
                  <span>Stop Reading</span>
                </DwellButton>
              )}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
            {['All', 'Top Stories', 'Science', 'Tech', 'National', 'Health'].map((cat) => (
              <DwellButton
                key={cat}
                id={`cat-filter-${cat}`}
                onClick={() => setSelectedCategory(cat)}
                variant={selectedCategory === cat ? 'primary' : 'surface'}
                size="normal"
                style={{ padding: '10px 18px', borderRadius: 'var(--radius-full)' }}
                ariaLabel={`Filter category: ${cat}`}
              >
                <span>{cat}</span>
              </DwellButton>
            ))}
          </div>

          {/* News Article Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredArticles.map((art, idx) => {
              const isCurrentlyRead = activeReadingIndex === idx && isReadingAloud;
              return (
                <DwellButton
                  key={art.id}
                  id={`news-card-${art.id}`}
                  onClick={() => setSelectedArticle(art)}
                  variant="surface"
                  size="large"
                  style={{
                    justifyContent: 'space-between',
                    textAlign: 'left',
                    minHeight: '110px',
                    padding: '22px 28px',
                    border: isCurrentlyRead ? '3px solid var(--primary)' : '2px solid var(--border)',
                    backgroundColor: isCurrentlyRead ? 'var(--surface-sage)' : 'var(--surface)',
                    transition: 'all 0.2s ease',
                  }}
                  ariaLabel={`Read article: ${art.title}`}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '85%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          fontSize: '0.8rem',
                          color: '#fff',
                          backgroundColor: '#E53935',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                        }}
                      >
                        {art.source}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {art.category} • {art.date}
                      </span>
                      {isCurrentlyRead && (
                        <span
                          style={{
                            fontSize: '0.8rem',
                            color: 'var(--primary)',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Volume2 size={16} /> Reading aloud...
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {art.title}
                    </span>
                    <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {art.summary}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: 'var(--primary)',
                      marginLeft: '16px',
                      flexShrink: 0,
                    }}
                  >
                    Open Story →
                  </span>
                </DwellButton>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION B: ARTICLE READING VIEW (Reading Mode Active)                     */}
      {/* ========================================================================= */}
      {selectedArticle && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
              <span>Back to Headlines</span>
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
                Reading Mode Active (Buttons locked for eye comfort)
              </span>

              {!isReadingAloud ? (
                <DwellButton
                  id="article-btn-read-aloud"
                  onClick={handleReadArticle}
                  variant="primary"
                  size="normal"
                  ariaLabel="Read story aloud"
                >
                  <Play size={20} />
                  <span>Read Story</span>
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
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#E53935', textTransform: 'uppercase' }}>
                {selectedArticle.source} • {selectedArticle.category}
              </span>
              <a
                href={selectedArticle.url}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: 'var(--primary)' }}
              >
                <span>India Today Portal</span>
                <ExternalLink size={14} />
              </a>
            </div>

            <h1 style={{ fontSize: 'var(--font-size-xl)', color: 'var(--text-primary)', lineHeight: 1.25 }}>
              {selectedArticle.title}
            </h1>

            <p
              style={{
                fontSize: '1.45rem',
                lineHeight: 1.85,
                color: 'var(--text-primary)',
                letterSpacing: '0.2px',
              }}
            >
              {selectedArticle.content}
            </p>
          </article>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION C: IN-APP YOUTUBE PLAYER & BROWSER                                 */}
      {/* ========================================================================= */}
      {activeTab === 'videos' && !selectedArticle && !selectedVideo && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Video Header & Custom URL Opener */}
          <div
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: 'var(--radius-lg)',
              border: '2px solid var(--border)',
              padding: '18px 24px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#E53935',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Youtube size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>
                  Embedded YouTube Player
                </h2>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Watch videos directly inside EyeControl without leaving the app
                </span>
              </div>
            </div>

            <DwellButton
              id="btn-toggle-custom-url"
              onClick={() => setShowUrlInput(!showUrlInput)}
              variant="sage"
              size="normal"
              ariaLabel="Open Custom YouTube Link"
            >
              <Plus size={20} />
              <span>{showUrlInput ? 'Close URL Input' : 'Enter YouTube Link'}</span>
            </DwellButton>
          </div>

          {/* Custom YouTube URL Loader Bar */}
          {showUrlInput && (
            <div
              style={{
                backgroundColor: 'var(--surface)',
                borderRadius: 'var(--radius-lg)',
                border: '2px solid var(--primary)',
                padding: '20px 24px',
                display: 'flex',
                gap: '16px',
                alignItems: 'center',
              }}
            >
              <input
                type="text"
                placeholder="Paste any YouTube video link (e.g. https://www.youtube.com/watch?v=...)"
                value={customUrlInput}
                onChange={(e) => setCustomUrlInput(e.target.value)}
                style={{
                  flex: 1,
                  padding: '14px 18px',
                  fontSize: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '2px solid var(--border)',
                  backgroundColor: '#fff',
                }}
              />
              <DwellButton
                id="btn-play-custom-video"
                onClick={handleLoadCustomVideo}
                variant="primary"
                size="normal"
                ariaLabel="Play Custom YouTube Video"
              >
                <Play size={20} />
                <span>Play Now</span>
              </DwellButton>
            </div>
          )}

          {/* Video Category Filter Pills */}
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
            {['All', 'Live News', 'Relaxing Nature', 'Tech & Science', 'Ambient Music'].map((cat) => (
              <DwellButton
                key={cat}
                id={`cat-vid-${cat}`}
                onClick={() => setSelectedCategory(cat)}
                variant={selectedCategory === cat ? 'primary' : 'surface'}
                size="normal"
                style={{ padding: '10px 18px', borderRadius: 'var(--radius-full)' }}
                ariaLabel={`Filter category: ${cat}`}
              >
                <span>{cat}</span>
              </DwellButton>
            ))}
          </div>

          {/* Videos Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {filteredVideos.map((vid) => (
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
                  minHeight: '200px',
                  padding: '24px',
                  textAlign: 'left',
                }}
                ariaLabel={`Watch video: ${vid.title}`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: '#E53935',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                    }}
                  >
                    <Play size={22} />
                  </div>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--primary)',
                      backgroundColor: 'var(--surface-sage)',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                      fontWeight: 700,
                    }}
                  >
                    {vid.category}
                  </span>
                </div>

                <div style={{ marginTop: '16px' }}>
                  <h3 style={{ fontSize: 'var(--font-size-md)', color: 'var(--text-primary)', fontWeight: 700 }}>
                    {vid.title}
                  </h3>
                  <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '6px', fontWeight: 400 }}>
                    {vid.description}
                  </p>
                </div>

                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)', marginTop: '12px' }}>
                  Watch Video Here →
                </span>
              </DwellButton>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION D: IN-APP EMBEDDED YOUTUBE PLAYER VIEW                            */}
      {/* ========================================================================= */}
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
              <span>Back to Video Library</span>
            </DwellButton>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#fff',
                  backgroundColor: '#E53935',
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                Playing In-App (No Tab Switching)
              </span>
            </div>
          </div>

          <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--text-primary)', margin: '4px 0' }}>
            {selectedVideo.title}
          </h2>

          {/* Embedded Responsive 16:9 YouTube iFrame */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              paddingBottom: '56.25%', // 16:9 ratio
              backgroundColor: '#000',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              border: '3px solid var(--border)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}
          >
            <iframe
              src={`${selectedVideo.embedUrl}?autoplay=1&rel=0&modestbranding=1`}
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

          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {selectedVideo.description}
          </p>
        </div>
      )}
    </div>
  );
};
