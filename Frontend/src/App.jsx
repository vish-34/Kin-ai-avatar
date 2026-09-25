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
import JoinBetaPage from './components/JoinBetaPage';
import LoginPage from './components/LoginPage';
import ConsentPage from './components/ConsentPage';
import BetaDashboardPage from './components/BetaDashboardPage';
import AdminApplicationsPage from './components/AdminApplicationsPage';
import { getVaultAvatars } from './utils/vaultStorage';
import { getCurrentUser, isAuthenticated, logout } from './services/authService';
import { hasConsented, CONSENT_VERSION } from './services/consentService';
import { trackEvent } from './services/analyticsService';
import './App.css';

export default function App() {
  const parsePageFromUrl = () => {
    const hash = window.location.hash;
    if (hash.startsWith('#/create') || hash.startsWith('#create')) return 'create';
    if (hash.startsWith('#/vault') || hash.startsWith('#vault')) return 'vault';
    if (hash.startsWith('#/room') || hash.startsWith('#room')) return 'room';
    if (hash.startsWith('#/join-beta') || hash.startsWith('#join-beta') || hash.startsWith('#/beta')) return 'join-beta';
    if (hash.startsWith('#/login') || hash.startsWith('#login')) return 'login';
    if (hash.startsWith('#/consent') || hash.startsWith('#consent')) return 'consent';
    if (hash.startsWith('#/dashboard') || hash.startsWith('#dashboard')) return 'dashboard';
    if (hash.startsWith('#/admin') || hash.startsWith('#admin')) return 'admin';

    // Pathname fallback if no hash
    const path = window.location.pathname;
    if (path.includes('/create')) return 'create';
    if (path.includes('/vault')) return 'vault';
    if (path.includes('/room')) return 'room';
    if (path.includes('/join-beta')) return 'join-beta';
    if (path.includes('/login')) return 'login';
    if (path.includes('/consent')) return 'consent';
    if (path.includes('/dashboard')) return 'dashboard';
    if (path.includes('/admin')) return 'admin';

    return 'home';
  };

  const [currentPage, setCurrentPage] = useState(parsePageFromUrl);
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [loginRedirectTarget, setLoginRedirectTarget] = useState(null);

  const [selectedAvatar, setSelectedAvatar] = useState(() => {
    const avatars = getVaultAvatars();
    return avatars.length > 0 ? avatars[0] : null;
  });

  const [justCreatedName, setJustCreatedName] = useState('');
  const [autoStartVideo, setAutoStartVideo] = useState(false);

  // Initialize Lenis ultra-smooth inertial momentum scrolling ONLY on Home
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

  // Ensure body and root shift up cleanly with zero blank space in studio, vault, or subpage mode
  const isFullAppView =
    currentPage === 'create' ||
    currentPage === 'vault' ||
    currentPage === 'room' ||
    currentPage === 'join-beta' ||
    currentPage === 'login' ||
    currentPage === 'consent' ||
    currentPage === 'dashboard' ||
    currentPage === 'admin';

  useEffect(() => {
    if (isFullAppView) {
      document.body.classList.add('studio-mode-active');
    } else {
      document.body.classList.remove('studio-mode-active');
    }
    return () => {
      document.body.classList.remove('studio-mode-active');
    };
  }, [isFullAppView]);

  // Sync state with URL hash and browser back/forward buttons
  useEffect(() => {
    const handleLocationChange = () => {
      const page = parsePageFromUrl();
      setCurrentPage(page);
      window.scrollTo(0, 0);
    };

    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);

    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  // Navigation handlers
  const navigateToHome = () => {
    window.location.hash = '#';
    setCurrentPage('home');
    window.scrollTo(0, 0);
  };

  const navigateToJoinBeta = () => {
    window.location.hash = '#/join-beta';
    setCurrentPage('join-beta');
    window.scrollTo(0, 0);
  };

  const navigateToLogin = (redirect = null) => {
    setLoginRedirectTarget(redirect);
    window.location.hash = redirect ? `#/login?redirect=${redirect}` : '#/login';
    setCurrentPage('login');
    window.scrollTo(0, 0);
  };

  const navigateToConsent = () => {
    window.location.hash = '#/consent';
    setCurrentPage('consent');
    window.scrollTo(0, 0);
  };

  const navigateToDashboard = () => {
    window.location.hash = '#/dashboard';
    setCurrentPage('dashboard');
    window.scrollTo(0, 0);
  };

  const navigateToAdmin = () => {
    window.location.hash = '#/admin';
    setCurrentPage('admin');
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

  const navigateToCreate = () => {
    window.location.hash = '#/create';
    setCurrentPage('create');
    window.scrollTo(0, 0);
    trackEvent('kin_creation_started');
  };

  // Route Protection & Consent Gate Guard
  useEffect(() => {
    if (currentPage === 'create') {
      if (!isAuthenticated()) {
        navigateToLogin('create');
      } else {
        const user = getCurrentUser();
        if (!hasConsented(user?.id, CONSENT_VERSION)) {
          navigateToConsent('create');
        }
      }
    } else if (currentPage === 'consent' || currentPage === 'dashboard') {
      if (!isAuthenticated()) {
        navigateToLogin();
      }
    } else if (currentPage === 'admin') {
      if (!isAuthenticated()) {
        navigateToLogin('admin');
      }
    }
  }, [currentPage, currentUser]);

  // Protected Click Handler for "Create Your KIN"
  const handleCreateKinClick = () => {
    if (!isAuthenticated()) {
      navigateToLogin('create');
      return;
    }
    const user = getCurrentUser();
    if (!hasConsented(user?.id, CONSENT_VERSION)) {
      navigateToConsent('create');
      return;
    }
    navigateToCreate();
  };

  const handleLoginSuccess = (user, redirectTarget) => {
    setCurrentUser(user);
    if (redirectTarget === 'create') {
      if (!hasConsented(user.id, CONSENT_VERSION)) {
        navigateToConsent('create');
      } else {
        navigateToCreate();
      }
    } else if (redirectTarget === 'admin' || user.role === 'admin') {
      navigateToAdmin();
    } else {
      navigateToDashboard();
    }
  };

  const handleLogout = () => {
    logout();
    setCurrentUser(null);
    navigateToHome();
  };

  return (
    <div className={`app-root-wrapper ${isFullAppView ? 'studio-active' : ''}`}>
      {/* 1. Protected KIN Creation Studio */}
      {currentPage === 'create' && (
        <main className="app-viewport studio-mode">
          <CreateAvatarPage
            onBackToHome={navigateToHome}
            onNavigateToVault={() => navigateToVault()}
            onAvatarCreated={(newAv) => {
              trackEvent('kin_created', { avatarId: newAv.id, name: newAv.name });
              navigateToVault(newAv.name);
            }}
          />
        </main>
      )}

      {/* 2. Family Vault (Saved Avatars & Deletion Flow Untouched) */}
      {currentPage === 'vault' && (
        <main className="app-viewport studio-mode">
          <FamilyVaultPage
            onBackToHome={navigateToHome}
            onNavigateToCreate={handleCreateKinClick}
            onSelectAvatar={navigateToRoom}
            justCreatedName={justCreatedName}
          />
        </main>
      )}

      {/* 3. Dialogue Room (Conversations & First-Session Feedback) */}
      {currentPage === 'room' && (
        <main className="app-viewport studio-mode">
          <AvatarDialogueRoom
            avatar={selectedAvatar}
            autoStartVideo={autoStartVideo}
            onBackToVault={() => navigateToVault()}
          />
        </main>
      )}

      {/* 4. Join the Beta Application Form */}
      {currentPage === 'join-beta' && (
        <main className="app-viewport studio-mode">
          <JoinBetaPage
            onBackToHome={navigateToHome}
            onNavigateToLogin={() => navigateToLogin()}
          />
        </main>
      )}

      {/* 5. Beta Participant Login Flow */}
      {currentPage === 'login' && (
        <main className="app-viewport studio-mode">
          <LoginPage
            onLoginSuccess={handleLoginSuccess}
            onBackToHome={navigateToHome}
            onNavigateToJoinBeta={navigateToJoinBeta}
            redirectTarget={loginRedirectTarget}
          />
        </main>
      )}

      {/* 6. Consent & Informed Agreement Gate */}
      {currentPage === 'consent' && (
        <main className="app-viewport studio-mode">
          <ConsentPage
            onConsentAccepted={() => navigateToCreate()}
            onBackToDashboard={navigateToDashboard}
            onBackToHome={navigateToHome}
          />
        </main>
      )}

      {/* 7. Beta Participant Dashboard */}
      {currentPage === 'dashboard' && (
        <main className="app-viewport studio-mode">
          <BetaDashboardPage
            onNavigateToCreate={handleCreateKinClick}
            onNavigateToConsent={navigateToConsent}
            onNavigateToVault={() => navigateToVault()}
            onNavigateToAdmin={navigateToAdmin}
            onLogoutSuccess={handleLogout}
            onBackToHome={navigateToHome}
          />
        </main>
      )}

      {/* 8. Admin Admissions Desk */}
      {currentPage === 'admin' && (
        <main className="app-viewport studio-mode">
          <AdminApplicationsPage
            onBackToDashboard={navigateToDashboard}
            onBackToHome={navigateToHome}
          />
        </main>
      )}

      {/* 9. Public Landing Page */}
      {currentPage === 'home' && (
        <main className="app-viewport">
          <Navbar
            onOpenCreateModal={handleCreateKinClick}
            onOpenVault={() => navigateToVault()}
            onNavigateToJoinBeta={navigateToJoinBeta}
            onNavigateToLogin={() => navigateToLogin()}
            onNavigateToDashboard={navigateToDashboard}
            onNavigateToConsent={navigateToConsent}
            currentUser={currentUser}
            onLogout={handleLogout}
          />
          <Hero onOpenCreateModal={handleCreateKinClick} />
          <div className="section-divider" />
          <CoreContrast />
          <div className="section-divider" />
          <AvatarDemo />
          <div className="section-divider" />
          <PersonaCreationFlow onOpenCreateModal={handleCreateKinClick} />
          <div className="section-divider" />
          <WhatsAppIngestion />
          <div className="section-divider" />
          <TrustPrivacy />
          <div className="section-divider" />
          <FAQ />
          <FooterCTA onOpenCreateModal={handleCreateKinClick} />
        </main>
      )}
    </div>
  );
}

