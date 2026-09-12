import React, { useState, useEffect } from 'react';
import Lenis from 'lenis';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import CoreContrast from './components/CoreContrast';
import AvatarDemo from './components/AvatarDemo';
import PersonaCreationFlow from './components/PersonaCreationFlow';
import WhatsAppIngestion from './components/WhatsAppIngestion';
import FAQ from './components/FAQ';
import TrustPrivacy from './components/TrustPrivacy';
import FooterCTA from './components/FooterCTA';
import ComingSoonPage from './components/ComingSoonPage';
import './App.css';

export default function App() {
  // Page view state: 'home' | 'create' | 'vault' | 'room' | 'coming-soon'
  const [currentPage, setCurrentPage] = useState(() => {
    const hash = window.location.hash;
    if (hash === '#/create') return 'create';
    if (hash === '#/vault') return 'vault';
    if (hash === '#/room') return 'room';
    if (hash === '#/coming-soon') return 'coming-soon';
    return 'home';
  });

  // Initialize Lenis smooth-scroll only on desktop (mouse wheel).
  // On touch/mobile devices we let native browser momentum handle scrolling —
  // it is significantly smoother than any JS-driven alternative on iOS/Android.
  useEffect(() => {
    let lenis = null;
    let rafId = null;

    const isTouchDevice = () =>
      window.matchMedia('(hover: none) and (pointer: coarse)').matches ||
      navigator.maxTouchPoints > 0;

    if (currentPage === 'home' && !isTouchDevice()) {
      lenis = new Lenis({
        duration: 1.6,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 0.88,
        touchMultiplier: 0,   // disabled — native touch handles it
        lerp: 0.06,
        infinite: false,
        syncTouch: false,
      });

      window.lenis = lenis;

      function raf(time) {
        lenis.raf(time);
        rafId = requestAnimationFrame(raf);
      }

      rafId = requestAnimationFrame(raf);
    } else {
      if (window.lenis) {
        window.lenis.destroy();
        window.lenis = null;
      }
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (lenis) {
        lenis.destroy();
        window.lenis = null;
      }
    };
  }, [currentPage]);

  // Sync state with URL hash and browser back/forward buttons
  useEffect(() => {
    const handleLocationChange = () => {
      const hash = window.location.hash;
      if (hash === '#/create') {
        setCurrentPage('create');
        window.scrollTo(0, 0);
      } else if (hash === '#/vault') {
        setCurrentPage('vault');
        window.scrollTo(0, 0);
      } else if (hash === '#/room') {
        setCurrentPage('room');
        window.scrollTo(0, 0);
      } else if (hash === '#/coming-soon') {
        setCurrentPage('coming-soon');
        window.scrollTo(0, 0);
      } else {
        setCurrentPage('home');
      }
    };

    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);

    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const navigateToCreate = () => {
    window.location.hash = '#/create';
    setCurrentPage('create');
    window.scrollTo(0, 0);
  };

  const navigateToVault = () => {
    window.location.hash = '#/vault';
    setCurrentPage('vault');
    window.scrollTo(0, 0);
  };

  const navigateToHome = () => {
    window.location.hash = '#';
    setCurrentPage('home');
    window.scrollTo(0, 0);
  };

  const isFullAppView = currentPage === 'create' || currentPage === 'vault' || currentPage === 'room' || currentPage === 'coming-soon';

  return (
    <div className="app-root-wrapper">
      {isFullAppView && (
        <main className="app-viewport">
          <Navbar
            onOpenCreateModal={navigateToCreate}
            onOpenVault={navigateToVault}
          />
          <ComingSoonPage
            activeFeature={currentPage === 'vault' ? 'vault' : 'studio'}
            onBackToHome={navigateToHome}
            onSelectFeature={(feat) => {
              if (feat === 'vault') navigateToVault();
              else navigateToCreate();
            }}
          />
          <div className="section-divider" />
          <FooterCTA onOpenCreateModal={navigateToCreate} />
        </main>
      )}

      {currentPage === 'home' && (
        <main className="app-viewport">
          <Navbar
            onOpenCreateModal={navigateToCreate}
            onOpenVault={navigateToVault}
          />
          <Hero onOpenCreateModal={navigateToCreate} />
          <div className="section-divider" />
          <CoreContrast />
          <div className="section-divider" />
          <AvatarDemo />
          <div className="section-divider" />
          <PersonaCreationFlow onOpenCreateModal={navigateToCreate} />
          <div className="section-divider" />
          <WhatsAppIngestion />
          <div className="section-divider" />
          <TrustPrivacy />
          <div className="section-divider" />
          <FAQ />
          <FooterCTA onOpenCreateModal={navigateToCreate} />
        </main>
      )}
    </div>
  );
}
