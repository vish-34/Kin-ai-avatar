import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Shield,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Mic,
  Video,
  Database,
  Users,
  Clock,
  Send,
  HeartHandshake
} from 'lucide-react';
import './ComingSoonPage.css';

export default function ComingSoonPage({
  activeFeature = 'studio',
  onBackToHome,
  onSelectFeature
}) {
  const [feature, setFeature] = useState(activeFeature === 'vault' ? 'vault' : 'studio');
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [inputError, setInputError] = useState('');

  // Sync with prop if it changes externally
  useEffect(() => {
    setFeature(activeFeature === 'vault' ? 'vault' : 'studio');
  }, [activeFeature]);

  // Check if user previously joined waitlist
  useEffect(() => {
    const saved = localStorage.getItem('kin_waitlist_email');
    if (saved) {
      setEmail(saved);
      setIsSubmitted(true);
    }
  }, []);

  const handleFeatureSwitch = (feat) => {
    setFeature(feat);
    if (onSelectFeature) {
      onSelectFeature(feat);
    }
  };

  const handleSubmitWaitlist = (e) => {
    e.preventDefault();
    if (!email || !email.includes('@') || !email.includes('.')) {
      setInputError('Please enter a valid email address');
      return;
    }
    setInputError('');
    setIsSubmitted(true);
    localStorage.setItem('kin_waitlist_email', email);
  };

  const handleReturnToDemo = (sectionId = 'live-avatar') => {
    if (onBackToHome) {
      onBackToHome();
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  };

  return (
    <section className="coming-soon-section">
      {/* Breadcrumb Back Button */}
      <div className="cs-breadcrumb-wrapper">
        <button
          type="button"
          onClick={onBackToHome}
          className="cs-breadcrumb"
          aria-label="Back to overview"
        >
          <ArrowLeft size={14} />
          <span>Back to Overview</span>
        </button>
      </div>

      {/* Feature Switcher Pills */}
      <div className="cs-toggle-container">
        <button
          type="button"
          className={`cs-toggle-pill ${feature === 'studio' ? 'active' : ''}`}
          onClick={() => handleFeatureSwitch('studio')}
        >
          <Sparkles size={15} />
          <span>Persona Studio</span>
          {feature === 'studio' && (
            <motion.div
              layoutId="csActivePillLight"
              className="cs-pill-glow"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
        </button>

        <button
          type="button"
          className={`cs-toggle-pill ${feature === 'vault' ? 'active' : ''}`}
          onClick={() => handleFeatureSwitch('vault')}
        >
          <Shield size={15} />
          <span>Family Vault</span>
          {feature === 'vault' && (
            <motion.div
              layoutId="csActivePillLight"
              className="cs-pill-glow"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
        </button>
      </div>

      {/* Dynamic Content */}
      <AnimatePresence mode="wait">
        {feature === 'studio' ? (
          <motion.div
            key="studio-content"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="cs-feature-details"
          >
            <div className="cs-badge">
              <Sparkles size={13} />
              <span>Under Active Development · Early Access Q2</span>
            </div>

            <h1 className="cs-title">
              AI Persona Studio is <span className="cs-highlight">Coming Soon</span>
            </h1>

            <p className="cs-subtitle">
              We are perfecting the neural voice cloning and real-time lip synchronization engine
              to ensure your loved one's presence is captured with unforgettable warmth and authenticity.
            </p>

            {/* Feature highlight grid */}
            <div className="cs-grid">
              <div className="cs-feature-card">
                <div className="cs-icon-box">
                  <Mic size={20} />
                </div>
                <h3>Zero-Shot Voice Cloning</h3>
                <p>Synthesize rich, emotional voice timbre from a brief 30-second audio sample.</p>
              </div>

              <div className="cs-feature-card">
                <div className="cs-icon-box">
                  <Video size={20} />
                </div>
                <h3>Real-time Video Synthesis</h3>
                <p>Ultra-low-latency facial motion and expressive responsiveness from a single portrait.</p>
              </div>

              <div className="cs-feature-card">
                <div className="cs-icon-box">
                  <Database size={20} />
                </div>
                <h3>Memory Graph Ingestion</h3>
                <p>Turn family WhatsApp chats, voice notes, and letters into an interactive memory bank.</p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="vault-content"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="cs-feature-details"
          >
            <div className="cs-badge vault-badge">
              <Shield size={13} />
              <span>Generational Archive · Coming Soon</span>
            </div>

            <h1 className="cs-title">
              Family Vault is <span className="cs-highlight vault-highlight">Coming Soon</span>
            </h1>

            <p className="cs-subtitle">
              A private, end-to-end encrypted sanctuary where your family’s stories, voices,
              and ancestral wisdom are preserved and cherished across generations.
            </p>

            {/* Feature highlight grid */}
            <div className="cs-grid">
              <div className="cs-feature-card">
                <div className="cs-icon-box vault-icon">
                  <Lock size={20} />
                </div>
                <h3>End-to-End Privacy</h3>
                <p>Your family recordings and memories are never used to train public foundation models.</p>
              </div>

              <div className="cs-feature-card">
                <div className="cs-icon-box vault-icon">
                  <Clock size={20} />
                </div>
                <h3>Living Biographical Timeline</h3>
                <p>Chronological memory milestones that avatars can reference in natural conversation.</p>
              </div>

              <div className="cs-feature-card">
                <div className="cs-icon-box vault-icon">
                  <Users size={20} />
                </div>
                <h3>Shared Family Circle</h3>
                <p>Invite family members worldwide to listen, converse, and add cherished memories.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Waitlist Box */}
      <div className="cs-waitlist-box">
        <div className="cs-waitlist-copy">
          <HeartHandshake size={22} className="cs-handshake-icon" />
          <div>
            <h4>Be the first to experience this</h4>
            <p>Join our private release cohort. We roll out invites weekly to waitlist members.</p>
          </div>
        </div>

        {isSubmitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="cs-success-state"
          >
            <CheckCircle2 size={20} className="cs-check-icon" />
            <div>
              <strong>You're on the priority waitlist!</strong>
              <span>We saved your invite for {email}. You'll be the first notified when this launches.</span>
            </div>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmitWaitlist} className="cs-form">
            <div className="cs-input-group">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="cs-email-input"
                required
              />
              <button type="submit" className="cs-submit-btn">
                <span>Get Early Access</span>
                <Send size={14} />
              </button>
            </div>
            {inputError && <p className="cs-error-msg">{inputError}</p>}
          </form>
        )}
      </div>

      {/* Footer Navigation CTAs */}
      <div className="cs-footer-ctas">
        <button
          type="button"
          onClick={() => handleReturnToDemo('live-avatar')}
          className="cs-cta-demo"
        >
          <span>Watch Live Interactive Avatar Demo</span>
        </button>
        <button
          type="button"
          onClick={onBackToHome}
          className="cs-cta-back"
        >
          <span>Explore Kin.ai Overview</span>
        </button>
      </div>
    </section>
  );
}
