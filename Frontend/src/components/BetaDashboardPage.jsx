import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Users,
  ShieldCheck,
  LogOut,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FolderLock,
  ArrowUpRight,
  Layers,
  Settings,
} from 'lucide-react';
import { getCurrentUser, logout, isAdmin } from '../services/authService';
import { hasConsented, getConsent, CONSENT_VERSION } from '../services/consentService';
import { getVaultAvatars } from '../utils/vaultStorage';
import './BetaDashboardPage.css';

export default function BetaDashboardPage({
  onNavigateToCreate,
  onNavigateToConsent,
  onNavigateToVault,
  onNavigateToAdmin,
  onLogoutSuccess,
  onBackToHome,
}) {
  const user = getCurrentUser();
  const userHasConsent = user ? hasConsented(user.id, CONSENT_VERSION) : false;
  const consentRecord = user ? getConsent(user.id) : null;
  const avatars = getVaultAvatars();
  const userIsAdmin = isAdmin();

  const handleLogout = () => {
    logout();
    if (onLogoutSuccess) {
      onLogoutSuccess();
    }
  };

  const handleCreateClick = () => {
    if (!userHasConsent) {
      if (onNavigateToConsent) onNavigateToConsent();
    } else {
      if (onNavigateToCreate) onNavigateToCreate();
    }
  };

  if (!user) return null;

  return (
    <div className="beta-dashboard-root">
      {/* Top Header */}
      <header className="dash-header-bar">
        <div className="dash-brand-wrap">
          <a href="#" onClick={(e) => { e.preventDefault(); onBackToHome(); }} className="dash-logo">
            <div className="logo-symbol small">
              <span className="symbol-dot dot-1" />
              <span className="symbol-dot dot-2" />
              <span className="symbol-dot dot-3" />
            </div>
            <span className="dash-logo-text">Kin<span className="logo-dot">.ai</span></span>
          </a>
          <span className="dash-cohort-badge">Beta Participant</span>
        </div>

        <div className="dash-header-actions">
          {userIsAdmin && (
            <button
              onClick={onNavigateToAdmin}
              className="dash-admin-link-btn"
              title="Admin admissions review"
            >
              <Settings size={14} />
              <span>Admin Portal</span>
            </button>
          )}

          <button onClick={handleLogout} className="dash-logout-btn" title="Sign out of beta session">
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <main className="dash-main-container">
        {/* Welcome Section */}
        <div className="dash-welcome-hero">
          <div className="dash-greeting-row">
            <div>
              <h1 className="dash-welcome-title">Welcome back, {user.name}</h1>
              <p className="dash-welcome-sub">
                Your private workspace for family living memory, neural voice modeling, and dialogue avatars.
              </p>
            </div>

            <div className="dash-user-pill">
              <span className="user-email-text">{user.email}</span>
              <span className="user-role-badge">{user.role === 'admin' ? 'Administrator' : 'Beta Participant'}</span>
            </div>
          </div>
        </div>

        {/* Primary Action Cards Grid */}
        <div className="dash-cards-grid">
          {/* Card 1: KIN Creation Status */}
          <div className="dash-feature-card highlight-card">
            <div className="card-top-indicator">
              <div className="feature-icon-circle studio">
                <Sparkles size={20} className="text-amber-600" />
              </div>
              <span className="status-badge live">
                {avatars.length > 0 ? `${avatars.length} Active Persona(s)` : 'Ready to Create'}
              </span>
            </div>

            <div className="card-content-block">
              <h3 className="card-title">Living Memory Studio</h3>
              <p className="card-desc">
                Synthesize a new family persona using WhatsApp chats, letters, voice recordings, and photographs.
              </p>
            </div>

            <div className="card-action-bar">
              <button onClick={handleCreateClick} className="dash-primary-card-btn">
                <span>{avatars.length > 0 ? 'Create Another KIN' : 'Create My KIN'}</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>

          {/* Card 2: Family Vault */}
          <div className="dash-feature-card">
            <div className="card-top-indicator">
              <div className="feature-icon-circle vault">
                <FolderLock size={20} className="text-emerald-700" />
              </div>
              <span className="status-badge subtle">{avatars.length} Preserved</span>
            </div>

            <div className="card-content-block">
              <h3 className="card-title">Family Vault</h3>
              <p className="card-desc">
                Access your encrypted memory store. Speak with existing avatars via speech, video calls, or text dialogue.
              </p>
            </div>

            <div className="card-action-bar">
              <button onClick={onNavigateToVault} className="dash-secondary-card-btn">
                <span>Enter Family Vault</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>

          {/* Card 3: Consent & Privacy */}
          <div className="dash-feature-card">
            <div className="card-top-indicator">
              <div className="feature-icon-circle privacy">
                <ShieldCheck size={20} className={userHasConsent ? 'text-emerald-600' : 'text-amber-600'} />
              </div>
              <span className={`status-badge ${userHasConsent ? 'green' : 'amber'}`}>
                {userHasConsent ? 'Consent Verified' : 'Action Required'}
              </span>
            </div>

            <div className="card-content-block">
              <h3 className="card-title">Informed Consent Agreement</h3>
              <p className="card-desc">
                {userHasConsent ? (
                  <>
                    Version <strong>{CONSENT_VERSION}</strong> affirmed
                    {consentRecord?.consentedAt && (
                      <> on {new Date(consentRecord.consentedAt).toLocaleDateString()}</>
                    )}
                    . Your data remains strictly encrypted and private.
                  </>
                ) : (
                  'You must review and accept the KIN Beta Consent & Agreement before you can launch the Creation Studio.'
                )}
              </p>
            </div>

            <div className="card-action-bar">
              <button onClick={onNavigateToConsent} className="dash-secondary-card-btn">
                <span>{userHasConsent ? 'Review Agreement' : 'Complete Consent Agreement'}</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Existing Deletion Note / Safeguard */}
        <div className="dash-privacy-guarantee-box">
          <div className="guarantee-icon">
            <ShieldCheck size={22} className="text-emerald-600" />
          </div>
          <div className="guarantee-text">
            <h4>Full Data Sovereignty & Memory Control</h4>
            <p>
              KIN is built on private family ownership. You may delete any saved persona and its associated voice recordings,
              transcripts, and photos at any time directly inside the <strong>Family Vault</strong>.
              Logging out preserves your saved avatars; account deletion is permanent and immediate.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
