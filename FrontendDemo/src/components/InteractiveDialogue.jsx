import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, Sparkles, Clock, ShieldCheck, Quote, ChevronRight } from 'lucide-react';

const sampleQueries = [
  {
    id: 'money',
    question: 'How did you handle the years when money was really tight?',
    speaker: 'Grandfather Thomas (Recorded at age 78)',
    timestamp: 'Chapter 04: The Foundry Years (1974)',
    audioDuration: '0:42',
    response:
      "We didn't talk about panic in the house. Your grandmother kept a small ledger on the icebox. When work slowed in '74, I took night shifts fixing boilers. What people get wrong about poverty is thinking it's about what you buy—it's really about maintaining your pride. We never let the table feel empty.",
    mindsetTag: 'Resilience & Family Pride',
    contextExcerpt: 'Recorded during the "Trial & Economic Hardship" guided session in October 2023.',
  },
  {
    id: 'career',
    question: 'What was the biggest risk you ever took in your twenties?',
    speaker: 'Grandmother Eleanor (Recorded at age 82)',
    timestamp: 'Chapter 02: Moving to Chicago (1966)',
    audioDuration: '0:36',
    response:
      "Everyone told me girls from Iowa don't open accounting firms in Chicago. I packed two suitcases and had one contact who didn't even pick up the phone. But if you wait until you aren't terrified, you'll spend your whole life standing on the platform watching trains leave.",
    mindsetTag: 'Courage & Self-Reliance',
    contextExcerpt: 'Recorded during the "Turning Points & Crossroad Choices" interview.',
  },
  {
    id: 'marriage',
    question: 'What kept you and Grandpa together for over 50 years?',
    speaker: 'Grandmother Eleanor (Recorded at age 82)',
    timestamp: 'Chapter 06: Partnership & Marriage',
    audioDuration: '0:48',
    response:
      "People think love is a feeling you fall into and stay in. It isn't. Love is a decision you remake every morning at 7 AM when someone is chewing loudly or when the water heater breaks. We simply agreed early on that walking away was never on the menu.",
    mindsetTag: 'Commitment & Realism',
    contextExcerpt: 'Recorded during the "Unspoken Wisdom on Relationships" session.',
  },
];

export default function InteractiveDialogue() {
  const [selectedId, setSelectedId] = useState(sampleQueries[0].id);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);

  const activeQuery = sampleQueries.find((q) => q.id === selectedId) || sampleQueries[0];

  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setPlaybackProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 2.5;
        });
      }, 100);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleSelect = (id) => {
    setSelectedId(id);
    setIsPlaying(false);
    setPlaybackProgress(0);
  };

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
    }
  };

  return (
    <section className="section-dialogue" id="features">
      <div className="section-header">
        <motion.span 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="section-tag"
        >
          Interactive Demonstration
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="section-title"
        >
          Ask a question.
          <br />
          <span className="text-highlight">Hear their true voice and reasoning.</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="section-subtitle"
        >
          Try selecting real questions below to see how Kin.ai queries authentic memory archives with grounded citations.
        </motion.p>
      </div>

      {/* Query Selector Tabs */}
      <div className="query-selector-row">
        {sampleQueries.map((item) => (
          <button
            key={item.id}
            onClick={() => handleSelect(item.id)}
            className={`query-pill-btn ${selectedId === item.id ? 'active' : ''}`}
          >
            <span className="query-pill-text">“{item.question}”</span>
          </button>
        ))}
      </div>

      {/* Interactive Dialogue Experience Card */}
      <motion.div 
        layout
        className="dialogue-display-card"
      >
        <div className="dialogue-card-header">
          <div className="speaker-meta">
            <div className="speaker-avatar-circle">
              {activeQuery.speaker.charAt(0)}
            </div>
            <div>
              <h4 className="speaker-name">{activeQuery.speaker}</h4>
              <p className="speaker-sub">{activeQuery.timestamp}</p>
            </div>
          </div>

          <div className="mindset-badge">
            <Sparkles size={13} />
            <span>{activeQuery.mindsetTag}</span>
          </div>
        </div>

        {/* Audio Player Bar */}
        <div className="audio-player-container">
          <button 
            onClick={togglePlay}
            className="play-toggle-btn"
            aria-label={isPlaying ? 'Pause' : 'Play response audio'}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
          </button>

          <div className="waveform-bar-wrapper">
            {/* Visual waveform bars */}
            <div className="waveform-bars">
              {[40, 65, 85, 30, 75, 95, 60, 45, 80, 100, 70, 50, 85, 60, 40, 90, 75, 55, 35, 70, 90, 65, 45, 80].map((h, i) => {
                const isPassed = (i / 24) * 100 <= playbackProgress;
                return (
                  <span
                    key={i}
                    className={`bar ${isPassed ? 'passed' : ''} ${isPlaying ? 'animated' : ''}`}
                    style={{
                      height: `${h}%`,
                      animationDelay: `${(i % 5) * 0.15}s`,
                    }}
                  />
                );
              })}
            </div>
            {/* Progress line */}
            <div className="progress-track">
              <div 
                className="progress-fill" 
                style={{ width: `${playbackProgress}%` }}
              />
            </div>
          </div>

          <div className="audio-time">
            <Volume2 size={14} className="volume-icon" />
            <span>{isPlaying ? `${Math.floor((playbackProgress / 100) * 42)}s` : activeQuery.audioDuration}</span>
          </div>
        </div>

        {/* Response Transcription */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeQuery.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="response-body"
          >
            <Quote className="quote-icon" size={28} />
            <p className="response-text">
              {activeQuery.response}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Grounded Citation & Trust Indicator */}
        <div className="dialogue-footer-meta">
          <div className="citation-row">
            <ShieldCheck size={14} className="shield-icon" />
            <span><strong>Grounded in authentic recording:</strong> {activeQuery.contextExcerpt}</span>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
