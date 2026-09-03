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
import CreateAvatarModal from './components/CreateAvatarModal';
import './App.css';

export default function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Initialize Lenis ultra-smooth inertial momentum scrolling
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.8,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.85,
      touchMultiplier: 1.2,
      lerp: 0.048, // Silky, cushioned momentum
      infinite: false,
      syncTouch: true,
    });

    // Make lenis globally accessible for navbar smooth scrolling
    window.lenis = lenis;

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      window.lenis = null;
      lenis.destroy();
    };
  }, []);

  return (
    <div className="app-root-wrapper">
      <main className="app-viewport">
        <Navbar onOpenCreateModal={() => setIsModalOpen(true)} />
        <Hero onOpenCreateModal={() => setIsModalOpen(true)} />
        <div className="section-divider" />
        <CoreContrast />
        <div className="section-divider" />
        <AvatarDemo />
        <div className="section-divider" />
        <PersonaCreationFlow onOpenCreateModal={() => setIsModalOpen(true)} />
        <div className="section-divider" />
        <WhatsAppIngestion />
        <div className="section-divider" />
        <TrustPrivacy />
        <div className="section-divider" />
        <FAQ />
        <FooterCTA onOpenCreateModal={() => setIsModalOpen(true)} />
      </main>

      {/* Interactive Avatar Creation Studio Modal */}
      <CreateAvatarModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
