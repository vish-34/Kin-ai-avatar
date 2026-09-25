import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ShieldCheck,
  FileText,
  Lock,
  Cpu,
  Layers,
  CheckSquare,
  Square,
  Sparkles,
  ArrowRight,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { CONSENT_VERSION, saveConsent } from '../services/consentService';
import { getCurrentUser } from '../services/authService';
import './ConsentPage.css';

const REQUIRED_CHECKBOXES = [
  {
    id: 'agree_terms',
    label: 'I have read and understood the KIN Beta Consent & Agreement.',
  },
  {
    id: 'agree_processing',
    label: 'I consent to KIN processing the memories and information I provide for creating and operating my KIN.',
  },
  {
    id: 'agree_voice',
    label: 'I consent to the use of my voice for generating my KIN.',
  },
  {
    id: 'agree_likeness',
    label: 'I consent to the use of my photographs/likeness for generating my KIN.',
  },
  {
    id: 'agree_accuracy',
    label: 'I understand that KIN uses AI-generated responses and that responses may sometimes be inaccurate.',
  },
  {
    id: 'agree_third_party',
    label: 'I understand that relevant third-party providers may process information required to provide voice and avatar functionality.',
  },
];

export default function ConsentPage({ onConsentAccepted, onBackToDashboard, onBackToHome }) {
  const currentUser = getCurrentUser();

  const [checkedItems, setCheckedItems] = useState({
    agree_terms: false,
    agree_processing: false,
    agree_voice: false,
    agree_likeness: false,
    agree_accuracy: false,
    agree_third_party: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const allChecked = REQUIRED_CHECKBOXES.every((item) => checkedItems[item.id]);

  const toggleCheck = (id) => {
    setCheckedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSelectAll = () => {
    const updated = {};
    REQUIRED_CHECKBOXES.forEach((item) => {
      updated[item.id] = true;
    });
    setCheckedItems(updated);
  };

  const handleAccept = async () => {
    if (!allChecked) {
      setErrorMsg('Please review and check all required consent affirmations before proceeding.');
      return;
    }

    if (!currentUser) {
      setErrorMsg('Active beta session expired. Please sign in again.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await saveConsent({
        userId: currentUser.id,
        consentVersion: CONSENT_VERSION,
        checkboxStates: checkedItems,
      });

      if (onConsentAccepted) {
        onConsentAccepted();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to record consent. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="consent-page-root">
      {/* Top Header */}
      <header className="consent-header-bar">
        <button
          onClick={onBackToDashboard || onBackToHome}
          className="consent-back-btn"
          aria-label="Back"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>

        <div className="consent-version-pill">
          <span className="dot-live" />
          <span>{CONSENT_VERSION}</span>
        </div>
      </header>

      <main className="consent-container">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="consent-paper"
        >
          {/* Agreement Title */}
          <div className="consent-title-section">
            <div className="consent-badge">
              <ShieldCheck size={14} className="text-emerald-700" />
              <span>Informed Beta Agreement</span>
            </div>
            <h1 className="consent-main-title">KIN Beta Participant Consent & Agreement</h1>
            <p className="consent-subtitle">
              Please review this agreement carefully. Creating a KIN involves personal memories, voice synthesis,
              and facial representation. Your affirmative consent is required before access to the KIN Creation Studio is granted.
            </p>
            {currentUser && (
              <div className="participant-meta-pill">
                <span>Participant: <strong>{currentUser.name}</strong> ({currentUser.email})</span>
              </div>
            )}
          </div>

          {/* Sectional Narrative Cards */}
          <div className="consent-sections-flow">
            {/* Section 1 */}
            <div className="consent-section-card">
              <div className="section-head">
                <div className="section-icon-box">
                  <Sparkles size={16} />
                </div>
                <h3>1. What KIN Does</h3>
              </div>
              <p>
                KIN creates an interactive artificial intelligence representation of a designated person using information
                provided by the participant. This includes personal memories, life stories, vocal tone recordings, and
                photographs. The resulting avatar operates as a conversational living memory interface.
              </p>
            </div>

            {/* Section 2 */}
            <div className="consent-section-card">
              <div className="section-head">
                <div className="section-icon-box">
                  <Layers size={16} />
                </div>
                <h3>2. What KIN Stores & Processes</h3>
              </div>
              <p>
                To calibrate and sustain your KIN, our platform processes and securely stores:
              </p>
              <ul className="consent-list">
                <li>Personal memories, notes, and biographical milestones.</li>
                <li>Uploaded documents and text excerpts (e.g. letters, WhatsApp chat logs).</li>
                <li>Photographs for facial rigging and expressive visual gaze.</li>
                <li>Voice audio recordings and synthesized audio files.</li>
                <li>Dialogue messages exchanged during beta conversational sessions.</li>
              </ul>
            </div>

            {/* Section 3 */}
            <div className="consent-section-card">
              <div className="section-head">
                <div className="section-icon-box">
                  <Cpu size={16} />
                </div>
                <h3>3. How AI Processing & Personas Work</h3>
              </div>
              <p>
                KIN uses large language models and neural speech models to generate conversational responses based on the provided material.
                <strong> KIN is not a human being.</strong> The generated persona is an algorithmic representation. Generated responses may
                occasionally be factually inaccurate, unexpected, or speculative.
              </p>
            </div>

            {/* Section 4 */}
            <div className="consent-section-card">
              <div className="section-head">
                <div className="section-icon-box">
                  <FileText size={16} />
                </div>
                <h3>4. Third-Party Service Providers</h3>
              </div>
              <p>
                To deliver state-of-the-art voice cloning and high-fidelity avatar rendering, the KIN Beta integrates select specialized providers:
              </p>
              <ul className="consent-list">
                <li><strong>ElevenLabs:</strong> For high-precision neural speech synthesis and voice cloning.</li>
                <li><strong>HeyGen / MuseTalk:</strong> For facial lip synchronization and video avatar generation.</li>
                <li><strong>KIN Infrastructure:</strong> For private family vault storage, vector indexing, and memory retrieval.</li>
              </ul>
              <p className="sub-note">
                Data sent to third-party providers is restricted to what is necessary for synthesis, subject to standard provider processing terms.
              </p>
            </div>

            {/* Section 5 */}
            <div className="consent-section-card">
              <div className="section-head">
                <div className="section-icon-box">
                  <ShieldCheck size={16} />
                </div>
                <h3>5. Participant Confirmation & Rights</h3>
              </div>
              <p>
                By proceeding, you confirm that you have the right and legal authority to upload the photos, voice samples, and personal stories
                used in the persona. You confirm that you understand the voice and likeness will be synthesized, and that you are creating this
                avatar in good faith for familial living memory preservation.
              </p>
            </div>

            {/* Section 6 */}
            <div className="consent-section-card">
              <div className="section-head">
                <div className="section-icon-box">
                  <Lock size={16} />
                </div>
                <h3>6. Privacy & Deletion Rights</h3>
              </div>
              <p>
                Your material is completely private by default. KIN will not publicly publish, commercialize, or share your voice, likeness, or memories
                without your explicit separate consent. You maintain full ownership and control over your family's data, and you may permanently delete
                any avatar and its associated memories at any time using the <strong>Family Vault deletion flow</strong>.
              </p>
            </div>
          </div>

          {/* Explicit Separate Checkboxes */}
          <div className="consent-checkboxes-block">
            <div className="checkboxes-header">
              <h3>Required Consent Affirmations</h3>
              <button type="button" onClick={handleSelectAll} className="select-all-btn">
                Select All
              </button>
            </div>

            <div className="checkbox-items-list">
              {REQUIRED_CHECKBOXES.map((item) => {
                const isChecked = checkedItems[item.id];
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleCheck(item.id)}
                    className={`consent-checkbox-row ${isChecked ? 'checked' : ''}`}
                    role="checkbox"
                    aria-checked={isChecked}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        toggleCheck(item.id);
                      }
                    }}
                  >
                    <div className="checkbox-box">
                      {isChecked ? (
                        <CheckSquare size={19} className="text-emerald-700" />
                      ) : (
                        <Square size={19} className="text-slate-400" />
                      )}
                    </div>
                    <label className="checkbox-label">{item.label}</label>
                  </div>
                );
              })}
            </div>
          </div>

          {errorMsg && (
            <div className="consent-error-banner" role="alert">
              <Info size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Footer */}
          <div className="consent-actions-footer">
            <button
              type="button"
              onClick={onBackToDashboard || onBackToHome}
              className="consent-cancel-btn"
            >
              <span>Decline for Now</span>
            </button>

            <button
              type="button"
              disabled={!allChecked || isSubmitting}
              onClick={handleAccept}
              className="consent-accept-btn"
            >
              {isSubmitting ? (
                <span>Recording Agreement...</span>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Accept & Create My KIN</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
