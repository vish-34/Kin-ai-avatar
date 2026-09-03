import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Sparkles } from 'lucide-react';

const navItems = [
  { name: 'How It Works', href: '#how-it-works', id: 'how-it-works' },
  { name: 'Live Avatar', href: '#live-avatar', id: 'live-avatar' },
  { name: 'Persona Studio', href: '#persona-studio', id: 'persona-studio' },
  { name: 'WhatsApp & Audio', href: '#memory-ingestion', id: 'memory-ingestion' },
  { name: 'FAQs', href: '#faqs', id: 'faqs' },
];

export default function Navbar({ onOpenCreateModal }) {
  const [activeTab, setActiveTab] = useState('How It Works');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const isAnimatingScroll = useRef(false);

  // Track scroll position — but SKIP active tab updates during programmatic scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);

      // Don't update active tab while we are animating a nav click
      if (isAnimatingScroll.current) return;

      const scrollPosition = window.scrollY + 180;
      for (const item of navItems) {
        const section = document.getElementById(item.id);
        if (section) {
          const top = section.offsetTop;
          const height = section.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveTab(item.name);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (e, href, name) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Lock the active tab immediately so it doesn't flicker
    isAnimatingScroll.current = true;
    setActiveTab(name);
    setMobileMenuOpen(false);

    const target = document.querySelector(href);
    if (!target) {
      isAnimatingScroll.current = false;
      return;
    }

    const navOffset = 90;
    const targetY = target.getBoundingClientRect().top + window.pageYOffset - navOffset;
    const startY = window.pageYOffset;
    const distance = targetY - startY;

    if (Math.abs(distance) < 5) {
      isAnimatingScroll.current = false;
      return;
    }

    if (window.lenis) window.lenis.stop();

    const duration = 1200;
    let startTime = null;

    const easeInOutCubic = (t) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      window.scrollTo(0, startY + distance * easeInOutCubic(progress));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Unlock after animation finishes
        isAnimatingScroll.current = false;
        if (window.lenis) window.lenis.start();
      }
    };

    requestAnimationFrame(animate);
  };

  return (
    <div className="navbar-fixed-wrapper">
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={`navbar-container ${isScrolled ? 'scrolled-sticky' : ''}`}
      >
        <div className="navbar-content">
          {/* Brand / Logo */}
          <a 
            href="#" 
            onClick={(e) => {
              e.preventDefault();
              const startY = window.pageYOffset;
              if (startY < 5) return;
              if (window.lenis) window.lenis.stop();
              isAnimatingScroll.current = true;

              const duration = 1200;
              let startTime = null;
              const ease = (t) => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;

              const step = (now) => {
                if (!startTime) startTime = now;
                const p = Math.min((now - startTime) / duration, 1);
                window.scrollTo(0, startY * (1 - ease(p)));
                if (p < 1) {
                  requestAnimationFrame(step);
                } else {
                  isAnimatingScroll.current = false;
                  if (window.lenis) window.lenis.start();
                }
              };
              requestAnimationFrame(step);
            }}
            className="navbar-logo" 
            aria-label="Kin.ai Home"
          >
            <div className="logo-symbol">
              <span className="symbol-dot dot-1" />
              <span className="symbol-dot dot-2" />
              <span className="symbol-dot dot-3" />
            </div>
            <span className="logo-text">Kin<span className="logo-dot">.ai</span></span>
          </a>

          {/* Center Nav Links */}
          <nav className="nav-links-desktop">
            {navItems.map((item) => {
              const isActive = activeTab === item.name;
              return (
                <a
                  key={item.name}
                  href={item.href}
                  onClick={(e) => scrollToSection(e, item.href, item.name)}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                >
                  {item.name}
                  {isActive && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="active-indicator"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </a>
              );
            })}
          </nav>

          {/* Right CTA */}
          <div className="navbar-actions">
            <motion.button 
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={onOpenCreateModal}
              className="cta-pill-btn"
            >
              <Sparkles size={14} />
              <span>Create Loved One's Avatar</span>
            </motion.button>

            {/* Mobile hamburger */}
            <button 
              className="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mobile-menu-container"
            >
              <div className="mobile-menu-list">
                {navItems.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    onClick={(e) => scrollToSection(e, item.href, item.name)}
                    className={`mobile-nav-link ${activeTab === item.name ? 'active' : ''}`}
                  >
                    {item.name}
                    {activeTab === item.name && <span className="mobile-active-dot" />}
                  </a>
                ))}
                <button 
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenCreateModal();
                  }}
                  className="cta-pill-btn mobile-cta"
                >
                  <Sparkles size={14} />
                  <span>Create Loved One's Avatar</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>
    </div>
  );
}
