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
import CreateAvatarPage from './components/CreateAvatarPage';
import FamilyVaultPage from './components/FamilyVaultPage';
import AvatarDialogueRoom from './components/AvatarDialogueRoom';
import { getVaultAvatars } from './utils/vaultStorage';
import './App.css';

export default function App() {
  // Page view state: 'home' | 'create' | 'vault' | 'room'
  const [currentPage, setCurrentPage] = useState(() => {
    const hash = window.location.hash;
    if (hash === '#/create') return 'create';
    if (hash === '#/vault') return 'vault';
    if (hash === '#/room') return 'room';
    return 'home';
  });

  const [selectedAvatar, setSelectedAvatar] = useState(() => {
    const avatars = getVaultAvatars();
    return avatars.length > 0 ? avatars[0] : null;
  });

  const [justCreatedName, setJustCreatedName] = useState('');
  const [autoStartVideo, setAutoStartVideo] = useState(false);

  // Initialize Lenis ultra-smooth inertial momentum scrolling on Home
  useEffect(() => {
    let lenis = null;

    if (currentPage === 'home') {
      lenis = new Lenis({
        duration: 1.8,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 0.85,
        touchMultiplier: 1.2,
        lerp: 0.048,
        infinite: false,
        syncTouch: true,
      });

      window.lenis = lenis;

      function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }

      requestAnimationFrame(raf);
    } else {
      if (window.lenis) {
        window.lenis.destroy();
        window.lenis = null;
      }
    }

    return () => {
      if (lenis) {
        window.lenis = null;
        lenis.destroy();
      }
    };
  }, [currentPage]);

  // Ensure body and root shift up cleanly with zero blank space in studio, vault, or room mode
  useEffect(() => {
    const isAppMode = currentPage === 'create' || currentPage === 'vault' || currentPage === 'room';
    if (isAppMode) {
      document.body.classList.add('studio-mode-active');
    } else {
      document.body.classList.remove('studio-mode-active');
    }
    return () => {
      document.body.classList.remove('studio-mode-active');
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

  const navigateToVault = (createdName = '') => {
    if (createdName) {
      setJustCreatedName(createdName);
    }
    window.location.hash = '#/vault';
    setCurrentPage('vault');
    window.scrollTo(0, 0);
  };

  const navigateToRoom = (avatar, startVideo = false) => {
    if (avatar) {
      setSelectedAvatar(avatar);
    }
    setAutoStartVideo(Boolean(startVideo));
    window.location.hash = '#/room';
    setCurrentPage('room');
    window.scrollTo(0, 0);
  };

  const navigateToHome = () => {
    window.location.hash = '#';
    setCurrentPage('home');
    window.scrollTo(0, 0);
  };

  const isFullAppView = currentPage === 'create' || currentPage === 'vault' || currentPage === 'room';

  return (
    <div className={`app-root-wrapper ${isFullAppView ? 'studio-active' : ''}`}>
      {currentPage === 'create' && (
        <main className="app-viewport studio-mode">
          <CreateAvatarPage
            onBackToHome={navigateToHome}
            onNavigateToVault={() => navigateToVault()}
            onAvatarCreated={(newAv) => navigateToVault(newAv.name)}
          />
        </main>
      )}

      {currentPage === 'vault' && (
        <main className="app-viewport studio-mode">
          <FamilyVaultPage
            onBackToHome={navigateToHome}
            onNavigateToCreate={navigateToCreate}
            onSelectAvatar={navigateToRoom}
            justCreatedName={justCreatedName}
          />
        </main>
      )}

      {currentPage === 'room' && (
        <main className="app-viewport studio-mode">
          <AvatarDialogueRoom
            avatar={selectedAvatar}
            autoStartVideo={autoStartVideo}
            onBackToVault={() => navigateToVault()}
          />
        </main>
      )}

      {currentPage === 'home' && (
        <main className="app-viewport">
          <Navbar
            onOpenCreateModal={navigateToCreate}
            onOpenVault={() => navigateToVault()}
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
