import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Mic, Image, MessageSquare, Sparkles, Check, ArrowRight, ArrowLeft, Volume2, ShieldCheck } from 'lucide-react';

export default function CreateAvatarModal({ isOpen, onClose }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    relation: 'Grandfather',
    personality: '',
    catchphrase: '',
    audioFile: null,
    photoFile: null,
    chatContext: '',
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [testQuery, setTestQuery] = useState('');
  const [testResponse, setTestResponse] = useState('');

  if (!isOpen) return null;

  const handleNext = () => {
    if (step === 3) {
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        setStep(4);
      }, 1500);
    } else {
      setStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setStep((prev) => prev - 1);
  };

  const handleTestAsk = () => {
    if (!testQuery.trim()) return;
    setTestResponse(
      `"Hey ${formData.name ? formData.name.split(' ')[0] : 'dear'}, it's so good to hear your voice. Always remember: ${formData.catchphrase || "Take things one step at a time, you've got the strength for this."}"`
    );
  };

  return (
    <AnimatePresence>
      <div className="modal-backdrop" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="create-avatar-modal"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Top Header */}
          <div className="modal-header">
            <div className="modal-title-group">
              <div className="modal-icon-badge">
                <Sparkles size={16} />
              </div>
              <div>
                <h3 className="modal-heading">Kin.ai Persona Studio</h3>
                <p className="modal-sub">Create an interactive AI avatar for your loved one</p>
              </div>
            </div>
            <button onClick={onClose} className="modal-close-btn" aria-label="Close modal">
              <X size={18} />
            </button>
          </div>

          {/* Step Progress Bar */}
          <div className="modal-steps-indicator">
            <div className={`step-item ${step >= 1 ? 'active' : ''}`}>
              <span className="step-num">1</span>
              <span className="step-label">Identity & Context</span>
            </div>
            <div className={`step-item ${step >= 2 ? 'active' : ''}`}>
              <span className="step-num">2</span>
              <span className="step-label">Voice Cloning</span>
            </div>
            <div className={`step-item ${step >= 3 ? 'active' : ''}`}>
              <span className="step-num">3</span>
              <span className="step-label">Photo Avatar</span>
            </div>
            <div className={`step-item ${step >= 4 ? 'active' : ''}`}>
              <span className="step-num">4</span>
              <span className="step-label">Interactive Persona</span>
            </div>
          </div>

          {/* Modal Step Content */}
          <div className="modal-body-content">
            {step === 1 && (
              <div className="step-form-grid">
                <div className="form-group">
                  <label>Loved One's Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Grandfather Robert Vance"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="modal-input"
                  />
                </div>

                <div className="form-group">
                  <label>Relationship to You</label>
                  <select
                    value={formData.relation}
                    onChange={(e) => setFormData({ ...formData, relation: e.target.value })}
                    className="modal-input"
                  >
                    <option value="Grandfather">Grandfather</option>
                    <option value="Grandmother">Grandmother</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Partner / Spouse">Partner / Spouse</option>
                    <option value="Sibling / Family">Sibling / Family</option>
                  </select>
                </div>

                <div className="form-group full-span">
                  <label>How did they think? (Personality traits & values)</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Deeply compassionate, always used analogies about gardening, very stoic about finances, loved telling stories about 1968..."
                    value={formData.personality}
                    onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                    className="modal-textarea"
                  />
                </div>

                <div className="form-group full-span">
                  <label>Signature Phrases or Advice they often repeated</label>
                  <input
                    type="text"
                    placeholder='e.g. "Never go to sleep angry", "Count your blessings twice"...'
                    value={formData.catchphrase}
                    onChange={(e) => setFormData({ ...formData, catchphrase: e.target.value })}
                    className="modal-input"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="step-upload-section">
                <div className="upload-dropzone">
                  <Mic size={32} className="upload-icon" />
                  <h4>Upload Voice Notes or Audio Recordings</h4>
                  <p>Upload WhatsApp voice messages (.opus/.mp3/.m4a) or phone voicemails (1-5 minutes recommended).</p>
                  <label className="upload-trigger-btn">
                    <span>Choose Audio Files</span>
                    <input type="file" accept="audio/*" className="hidden-file-input" />
                  </label>
                </div>

                <div className="sample-voice-test">
                  <div className="sample-voice-badge">
                    <Volume2 size={13} />
                    <span>Demo Cloned Voice Profile</span>
                  </div>
                  <p className="sample-voice-desc">
                    Our model automatically isolates speech from background noise and extracts their exact vocal timbre.
                  </p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="step-upload-section">
                <div className="upload-dropzone">
                  <Image size={32} className="upload-icon" />
                  <h4>Upload a Portrait Photograph</h4>
                  <p>Upload a clear photo of their face. Front-facing portraits with good lighting yield the most natural 3D expressions.</p>
                  <label className="upload-trigger-btn">
                    <span>Choose Photo (.jpg / .png)</span>
                    <input type="file" accept="image/*" className="hidden-file-input" />
                  </label>
                </div>

                <div className="privacy-guarantee-box">
                  <ShieldCheck size={16} className="text-emerald-600" />
                  <span>Photos & voice models are encrypted with private family lineage keys and never shared.</span>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="step-completed-preview">
                <div className="success-banner">
                  <Sparkles size={20} className="text-zinc-900" />
                  <h4>{formData.name || 'Your Loved One'}'s Persona is Ready!</h4>
                  <p>Voice cloned, facial animation rigged, and memory context synthesized.</p>
                </div>

                {/* Instant Test Box */}
                <div className="interactive-test-sandbox">
                  <label className="test-label">Ask a question to test their persona:</label>
                  <div className="test-input-row">
                    <input
                      type="text"
                      placeholder="e.g. What advice would you give me today?"
                      value={testQuery}
                      onChange={(e) => setTestQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleTestAsk();
                      }}
                      className="test-input"
                    />
                    <button onClick={handleTestAsk} className="test-ask-btn">
                      Speak
                    </button>
                  </div>

                  {testResponse && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="test-response-bubble"
                    >
                      <div className="test-response-header">
                        <Volume2 size={13} className="text-zinc-500" />
                        <span>{formData.name || 'Loved One'} (Responding in Cloned Voice)</span>
                      </div>
                      <p className="test-text">{testResponse}</p>
                    </motion.div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Controls */}
          <div className="modal-footer-nav">
            {step > 1 && step < 4 && (
              <button onClick={handlePrev} className="modal-back-btn">
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
            )}

            {step < 4 ? (
              <button
                onClick={handleNext}
                disabled={isProcessing}
                className="modal-next-btn"
              >
                {isProcessing ? (
                  <span>Synthesizing Persona...</span>
                ) : (
                  <>
                    <span>{step === 3 ? 'Generate Persona' : 'Continue'}</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            ) : (
              <button onClick={onClose} className="modal-next-btn">
                <span>Save to Family Vault & Close</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
