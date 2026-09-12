import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, MessageCircle, Mic, ArrowRight, Heart } from 'lucide-react';

export default function Hero({ onOpenCreateModal }) {
  // Delicate ambient micro-dots for ethereal aesthetic (no hands)
  const dots = useMemo(() => {
    const arr = [];
    const count = 36;
    for (let i = 0; i < count; i++) {
      arr.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2.5 + 1,
        opacity: Math.random() * 0.3 + 0.1,
        duration: Math.random() * 4 + 4,
        delay: Math.random() * 2,
      });
    }
    return arr;
  }, []);

  // Framer Motion slide-up variants for masked text
  const slideUpVariants = {
    hidden: { 
      y: '115%', 
      opacity: 0,
      rotateX: 10,
    },
    visible: (customDelay) => ({
      y: '0%',
      opacity: 1,
      rotateX: 0,
      transition: {
        duration: 1.1,
        ease: [0.16, 1, 0.3, 1],
        delay: customDelay,
      },
    }),
  };

  const fadeUpVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: (customDelay) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.9,
        ease: [0.16, 1, 0.3, 1],
        delay: customDelay,
      },
    }),
  };

  const scrollToSection = (selector) => {
    const el = document.querySelector(selector);
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
    <section className="hero-section">
      {/* Subtle Dot Grid & Atmospheric Depth */}
      <div className="hero-atmosphere" aria-hidden="true">
        <div className="subtle-dot-grid" />
        
        {dots.map((dot) => (
          <motion.div
            key={dot.id}
            className="ambient-dot"
            style={{
              left: `${dot.x}%`,
              top: `${dot.y}%`,
              width: `${dot.size}px`,
              height: `${dot.size}px`,
            }}
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [dot.opacity * 0.4, dot.opacity, dot.opacity * 0.4],
              y: [0, -15, 0],
            }}
            transition={{
              duration: dot.duration,
              repeat: Infinity,
              delay: dot.delay,
              ease: 'easeInOut',
            }}
          />
        ))}

        <div className="subtle-horizontal-guide guide-top" />
        <div className="subtle-horizontal-guide guide-bottom" />
      </div>

      {/* Main Center Content */}
      <div className="hero-center-container">
        {/* Memory Tag */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05 }}
          className="hero-badge"
        >
          <Heart size={13} className="text-rose-500 fill-rose-500/20" />
          <span>Preserving the Voices & Minds We Miss Most</span>
        </motion.div>

        <div className="hero-typography-block">
          {/* Masked Line 1: "What if memories" */}
          <div className="text-mask-wrapper">
            <motion.h1
              custom={0.15}
              initial="hidden"
              animate="visible"
              variants={slideUpVariants}
              className="hero-headline line-one"
            >
              What if memories
            </motion.h1>
          </div>

          {/* Masked Line 2: "could talk?" */}
          <div className="text-mask-wrapper">
            <motion.h1
              custom={0.35}
              initial="hidden"
              animate="visible"
              variants={slideUpVariants}
              className="hero-headline line-two"
            >
              could talk?
            </motion.h1>
          </div>
        </div>

        {/* Subtitle / Proposition */}
        <motion.p
          custom={0.6}
          initial="hidden"
          animate="visible"
          variants={fadeUpVariants}
          className="hero-subtext"
        >
          When we lose someone, we lose the way they spoke, reasoned, and advised us.
          <br className="desktop-break" />
          <strong>Kin.ai</strong> creates an interactive AI avatar from their photos, voice notes,
          and WhatsApp chats—so you can speak with them in their true voice, face, and persona anytime.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          custom={0.75}
          initial="hidden"
          animate="visible"
          variants={fadeUpVariants}
          className="hero-cta-wrapper"
        >
          <motion.button
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={onOpenCreateModal}
            className="hero-primary-btn"
          >
            <span>Create Loved One's Avatar</span>
            <ArrowRight size={15} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => scrollToSection('#live-avatar')}
            className="hero-secondary-btn"
          >
            <Sparkles size={14} />
            <span>Try Live Avatar Demo</span>
          </motion.button>
        </motion.div>
      </div>

      {/* Bottom Editorial Meta Information */}
      <motion.footer 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.95, ease: [0.16, 1, 0.3, 1] }}
        className="hero-footer-bar"
      >
        <div className="footer-col footer-left">
          <p>Voice Cloning • Facial Avatar • Persona Context</p>
        </div>

        <div className="footer-col footer-center">
          <p>
            Private family space. Grounded in their actual words, voice notes, and letters.
          </p>
        </div>

        <div className="footer-col footer-right">
          <a href="#how-it-works" onClick={(e) => { e.preventDefault(); scrollToSection('#how-it-works'); }} className="scroll-hint">
            [Explore How It Works]
          </a>
        </div>
      </motion.footer>
    </section>
  );
}
