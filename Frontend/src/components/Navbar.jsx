import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Sparkles, LogIn, LogOut, User, ShieldCheck, LayoutDashboard } from 'lucide-react';

const publicNavItems = [
  { name: 'How It Works', href: '#how-it-works', id: 'how-it-works' },
  { name: 'Live Avatar', href: '#live-avatar', id: 'live-avatar' },
  { name: 'Persona Studio', href: '#persona-studio', id: 'persona-studio' },
  { name: 'WhatsApp & Audio', href: '#memory-ingestion', id: 'memory-ingestion' },
  { name: 'FAQs', href: '#faqs', id: 'faqs' },
];

export default function Navbar({
  onOpenCreateModal,
  onOpenVault,
  onNavigateToJoinBeta,
  onNavigateToLogin,
  onNavigateToDashboard,
  onNavigateToConsent,
  currentUser = null,
  onLogout,
}) {
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
      for (const item of publicNavItems) {
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
            {publicNavItems.map((item) => {
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

            {/* Authenticated Links inside Center Nav */}
            {currentUser && (
              <>
                <button
                  onClick={onNavigateToDashboard}
                  className="nav-link text-btn"
                  title="Beta participant dashboard"
                >
                  Dashboard
                </button>
                <button
                  onClick={onNavigateToConsent}
                  className="nav-link text-btn"
                  title="Review beta consent and privacy agreement"
                >
                  Consent
                </button>
              </>
            )}
          </nav>

          {/* Right CTA Actions */}
          <div className="navbar-actions">
            {!currentUser ? (
              /* Public Visitor State */
              <>
                <button
                  onClick={onNavigateToLogin}
                  className="navbar-login-subtle-btn"
                  title="Sign in with beta credentials"
                >
                  <LogIn size={14} />
                  <span>Login</span>
                </button>

                <motion.button
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onNavigateToJoinBeta}
                  className="cta-pill-btn beta-cta"
                  title="Apply for early cohort access"
                >
                  <Sparkles size={14} />
                  <span className="desktop-nav-cta-text">Join the Beta</span>
                  <span className="mobile-nav-cta-text">Beta</span>
                </motion.button>
              </>
            ) : (
              /* Authenticated Beta User State */
              <>
                {onOpenVault && (
                  <motion.button
                    whileHover={{ scale: 1.03, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onOpenVault}
                    className="navbar-vault-btn"
                    title="View your saved avatars"
                  >
                    <span>Family Vault</span>
                  </motion.button>
                )}

                <motion.button 
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onOpenCreateModal}
                  className="cta-pill-btn"
                  title="Create a new KIN persona"
                >
                  <Sparkles size={14} />
                  <span className="desktop-nav-cta-text">Create Your KIN</span>
                  <span className="mobile-nav-cta-text">Create</span>
                </motion.button>

                <button
                  onClick={onLogout}
                  className="navbar-logout-icon-btn"
                  title={`Signed in as ${currentUser.name} — Sign Out`}
                >
                  <LogOut size={16} />
                </button>
              </>
            )}

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
                {publicNavItems.map((item) => (
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

                {currentUser ? (
                  <>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onNavigateToDashboard();
                      }}
                      className="mobile-nav-link text-btn"
                    >
                      <span>Beta Dashboard</span>
                    </button>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onNavigateToConsent();
                      }}
                      className="mobile-nav-link text-btn"
                    >
                      <span>Consent Agreement</span>
                    </button>
                    {onOpenVault && (
                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          onOpenVault();
                        }}
                        className="navbar-vault-btn mobile-vault-btn"
                      >
                        <span>Family Vault</span>
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenCreateModal();
                      }}
                      className="cta-pill-btn mobile-cta"
                    >
                      <Sparkles size={14} />
                      <span>Create Your KIN</span>
                    </button>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onLogout();
                      }}
                      className="mobile-nav-link text-btn logout-text"
                    >
                      <span>Sign Out ({currentUser.name})</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onNavigateToLogin();
                      }}
                      className="mobile-nav-link text-btn"
                    >
                      <span>Beta Sign In</span>
                    </button>
                    <button 
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onNavigateToJoinBeta();
                      }}
                      className="cta-pill-btn mobile-cta beta-cta"
                    >
                      <Sparkles size={14} />
                      <span>Join the Beta</span>
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>
    </div>
  );
}

