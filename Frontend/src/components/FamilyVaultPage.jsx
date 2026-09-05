import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Sparkles,
  Plus,
  Mic,
  Trash2,
  Clock,
  Heart,
  User,
  RotateCcw,
  Video
} from 'lucide-react';
import { getVaultAvatars, deleteAvatarFromVault } from '../utils/vaultStorage';
import './FamilyVaultPage.css';

// Framer motion easing curve matching the rest of Kin.ai
const transitionEase = [0.16, 1, 0.3, 1];

const headerVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (customDelay = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: transitionEase,
      delay: customDelay,
    },
  }),
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.45,
      ease: transitionEase,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: 0.2,
      ease: transitionEase,
    },
  },
};

export default function FamilyVaultPage({
  onBackToHome,
  onNavigateToCreate,
  onSelectAvatar,
  justCreatedName = '',
}) {
  const [avatars, setAvatars] = useState(() => getVaultAvatars());
  const [notification, setNotification] = useState(
    justCreatedName ? `“${justCreatedName}” was successfully added to your Family Vault!` : ''
  );

  const handleDelete = (id, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to remove this persona from your family vault?')) {
      const updated = deleteAvatarFromVault(id);
      setAvatars(updated);
    }
  };

  const handleResetPresets = () => {
    localStorage.removeItem('kin_ai_family_vault_avatars');
    setAvatars(getVaultAvatars());
    setNotification('Default family avatars restored.');
    setTimeout(() => setNotification(''), 3500);
  };

  return (
    <div className="vault-root-container">
      {/* Subtle atmospheric backdrop aligning with Kin.ai visual depth */}
      <div className="vault-atmosphere" aria-hidden="true">
        <div className="vault-subtle-grid" />
        <div className="vault-ambient-glow" />
      </div>

      {/* Top Sticky Navbar */}
      <header className="vault-navbar">
        <div className="vault-nav-left">
          <motion.button
            whileHover={{ x: -2 }}
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.2, ease: transitionEase }}
            onClick={onBackToHome}
            className="vault-back-btn"
          >
            <ArrowLeft size={16} />
            <span>Back to Kin.ai Home</span>
          </motion.button>

          <div className="vault-nav-divider" />

          {/* Switcher between Persona Studio & Family Vault */}
          <div className="vault-top-switcher">
            <button
              onClick={onNavigateToCreate}
              className="switcher-tab"
              title="Create a new avatar in Persona Studio"
            >
              <Sparkles size={14} />
              <span>Persona Studio</span>
            </button>
            <button className="switcher-tab active" title="Currently viewing Family Vault">
              <span className="switcher-dot" />
              <span>Family Vault ({avatars.length})</span>
            </button>
          </div>
        </div>

        <div className="vault-nav-right">
          <motion.button
            whileHover={{ y: -1, scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.2, ease: transitionEase }}
            onClick={onNavigateToCreate}
            className="vault-create-new-btn"
          >
            <Plus size={16} />
            <span>Create New Avatar</span>
          </motion.button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="vault-content-viewport">
        {/* Banner Alert if just created */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280 }}
              className="vault-alert-banner"
            >
              <Sparkles size={16} className="text-emerald-600" />
              <span>{notification}</span>
              <button onClick={() => setNotification('')} className="alert-close-x">
                ×
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero Header Orchestration */}
        <motion.div
          initial="hidden"
          animate="visible"
          className="vault-page-header"
        >
          <motion.div
            custom={0.05}
            variants={headerVariants}
            className="vault-header-badge"
          >
            <Heart size={13} className="text-rose-500 fill-rose-500/20" />
            <span>Private Lineage Sanctum</span>
          </motion.div>

          <motion.h1
            custom={0.12}
            variants={headerVariants}
            className="vault-page-title"
          >
            Your Family Vault
          </motion.h1>

          <motion.p
            custom={0.2}
            variants={headerVariants}
            className="vault-page-subtitle"
          >
            Interactive avatars preserved in their authentic voice, WhatsApp expressions, and photographs.
            Select any persona below to step into their presence room.
          </motion.p>
        </motion.div>

        {/* Avatars Grid with Stagger & FLIP Layout Physics */}
        {avatars.length > 0 ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="vault-avatars-grid"
          >
            <AnimatePresence>
              {avatars.map((avatar) => (
                <motion.div
                  layout
                  key={avatar.id}
                  variants={cardVariants}
                  whileHover={{
                    y: -7,
                    transition: { duration: 0.35, ease: transitionEase },
                  }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => onSelectAvatar(avatar)}
                  className="vault-avatar-card"
                >
                  {/* Portrait Header */}
                  <div className="avatar-card-image-wrap">
                    <img
                      src={
                        avatar.photoUrl ||
                        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&auto=format&fit=crop&q=80'
                      }
                      alt={avatar.name}
                      className="avatar-card-img"
                    />
                    <div className="avatar-card-overlay-gradient" />

                    {/* Live Voice Status Indicator */}
                    <div className="avatar-live-status">
                      <span className="live-status-dot" />
                      <span>Voice Cloned & Ready</span>
                    </div>

                    {/* Quick Delete Persona Action */}
                    <motion.button
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => handleDelete(avatar.id, e)}
                      className="avatar-card-delete-btn"
                      title="Remove from vault"
                    >
                      <Trash2 size={13} />
                    </motion.button>
                  </div>

                  {/* Card Body */}
                  <div className="avatar-card-body">
                    <div className="avatar-card-title-row">
                      <div>
                        <h3 className="avatar-card-name">{avatar.name}</h3>
                        <p className="avatar-card-calling">
                          {avatar.callingName ? `“${avatar.callingName}”` : ''}{' '}
                          {avatar.relation ? `• ${avatar.relation}` : ''}
                        </p>
                      </div>
                    </div>

                    {avatar.lifespan && (
                      <span className="avatar-era-tag">
                        <Clock size={11} />
                        <span>{avatar.lifespan}</span>
                      </span>
                    )}

                    {avatar.personalitySummary && (
                      <p className="avatar-card-summary">{avatar.personalitySummary}</p>
                    )}

                    {avatar.catchphrases && avatar.catchphrases.length > 0 && (
                      <div className="avatar-catchphrase-chip">
                        <span>“{avatar.catchphrases[0]}”</span>
                      </div>
                    )}

                    <div className="avatar-card-meta-box">
                      <span className="meta-label">Sources:</span>
                      <span className="meta-value">
                        {avatar.contextSourcesSummary || 'WhatsApp Chats • Voice Notes • Photos'}
                      </span>
                    </div>

                    {/* Primary CTAs: Voice Chat & Fullscreen Video Call */}
                    <div className="avatar-card-footer">
                      <div className="avatar-card-footer-dual">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          transition={{ duration: 0.2, ease: transitionEase }}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectAvatar(avatar, false);
                          }}
                          className="card-speak-btn-secondary"
                          title={`Voice Dialogue with ${avatar.callingName || avatar.name}`}
                        >
                          <Mic size={14} />
                          <span>Voice Chat</span>
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.02, y: -1 }}
                          whileTap={{ scale: 0.97 }}
                          transition={{ duration: 0.2, ease: transitionEase }}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectAvatar(avatar, true);
                          }}
                          className="card-video-call-btn"
                          title={`Enter Fullscreen Video Call with ${avatar.callingName || avatar.name}`}
                        >
                          <Video size={14} />
                          <span>Video Call</span>
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: transitionEase }}
            className="vault-empty-state"
          >
            <motion.div
              animate={{ y: [0, -7, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <User size={48} className="empty-vault-icon" />
            </motion.div>
            <h3>Your Family Vault is currently empty</h3>
            <p>
              Preserve your elders and loved ones by creating an avatar with photos, WhatsApp chats, and voice notes,
              or restore our pre-calibrated sample personas.
            </p>
            <div className="empty-actions-row">
              <motion.button
                whileHover={{ y: -1, scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={onNavigateToCreate}
                className="vault-create-new-btn"
              >
                <Plus size={16} />
                <span>Create Your First Avatar</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleResetPresets}
                className="vault-restore-btn"
              >
                <RotateCcw size={14} />
                <span>Restore Sample Personas</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
