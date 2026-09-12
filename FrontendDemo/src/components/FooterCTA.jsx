import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Sparkles, Heart } from 'lucide-react';

export default function FooterCTA({ onOpenCreateModal }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
    }
  };

  const scrollToSection = (e, href) => {
    e.preventDefault();
    const el = document.querySelector(href);
    if (!el) return;
    const targetY = el.getBoundingClientRect().top + window.pageYOffset - 90;
    const startY = window.pageYOffset;
    const distance = targetY - startY;
    if (Math.abs(distance) < 5) return;

    if (window.lenis) window.lenis.stop();

    const duration = 1200;
    let startTime = null;
    const ease = (t) => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;

    const step = (now) => {
      if (!startTime) startTime = now;
      const p = Math.min((now - startTime) / duration, 1);
      window.scrollTo(0, startY + distance * ease(p));
      if (p < 1) requestAnimationFrame(step);
      else if (window.lenis) window.lenis.start();
    };
    requestAnimationFrame(step);
  };

  return (
    <footer className="footer-cta-wrapper">
      {/* Editorial Invite CTA */}
      <div className="final-cta-card">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="cta-inner-content"
        >
          <div className="cta-mini-tag">
            <Heart size={13} className="text-rose-500 fill-rose-500/20" />
            <span>Kin.ai Family Lineage</span>
          </div>

          <h2 className="cta-heading">
            Don't let their stories & voice
            <br />
            become distant memories.
          </h2>

          <p className="cta-subheading">
            Create an interactive avatar with their photos, voice notes, and WhatsApp chats. Speak with them in their true voice anytime.
          </p>

          <div className="cta-button-group">
            <button onClick={onOpenCreateModal} className="cta-action-primary">
              <Sparkles size={16} />
              <span>Create Loved One's Avatar</span>
              <ArrowRight size={15} />
            </button>
          </div>

          <div className="cta-privacy-note">
            <span>Encrypted • 100% Private Family Lineage • Never Shared with Third Parties</span>
          </div>
        </motion.div>
      </div>

      {/* Bottom Plain Editorial Footer */}
      <div className="site-bottom-footer">
        <div className="footer-brand-side">
          <div className="footer-logo">
            <div className="logo-symbol small">
              <span className="symbol-dot dot-1" />
              <span className="symbol-dot dot-2" />
              <span className="symbol-dot dot-3" />
            </div>
            <span className="footer-brand-name">Kin.ai</span>
          </div>
          <p className="footer-tagline">
            Interactive AI avatars for lost loved ones, grandparents, and parents. Preserving their authentic voice, face, and persona for generations.
          </p>
        </div>

        <div className="footer-links-grid">
          <div className="footer-col-nav">
            <h5>Navigation</h5>
            <a href="#how-it-works" onClick={(e) => scrollToSection(e, '#how-it-works')}>How It Works</a>
            <a href="#live-avatar" onClick={(e) => scrollToSection(e, '#live-avatar')}>Live Avatar Demo</a>
            <a href="#persona-studio" onClick={(e) => scrollToSection(e, '#persona-studio')}>Persona Studio</a>
            <a href="#memory-ingestion" onClick={(e) => scrollToSection(e, '#memory-ingestion')}>WhatsApp & Audio</a>
            <a href="#faqs" onClick={(e) => scrollToSection(e, '#faqs')}>FAQs</a>
          </div>

          <div className="footer-col-nav">
            <h5>Capabilities</h5>
            <a href="#live-avatar" onClick={(e) => scrollToSection(e, '#live-avatar')}>Voice Cloning</a>
            <a href="#live-avatar" onClick={(e) => scrollToSection(e, '#live-avatar')}>3D Facial Avatar</a>
            <a href="#memory-ingestion" onClick={(e) => scrollToSection(e, '#memory-ingestion')}>WhatsApp Chat Parser</a>
            <a href="#how-it-works" onClick={(e) => scrollToSection(e, '#how-it-works')}>Cognitive Persona</a>
          </div>

          <div className="footer-col-nav">
            <h5>Trust & Privacy</h5>
            <a href="#">Family Encryption</a>
            <a href="#">Ethics Manifesto</a>
            <a href="#">Opt-In Consent</a>
            <a href="#">Privacy Policy</a>
          </div>
        </div>
      </div>

      <div className="footer-copyright-bar">
        <p>© 2026 Kin.ai. All rights reserved. Preserving the people we cherish.</p>
        <p className="footer-sub-quote">“What if memories could talk?”</p>
      </div>
    </footer>
  );
}
