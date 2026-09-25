import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Heart, CheckCircle2, MessageSquare } from 'lucide-react';
import { saveFeedback } from '../services/feedbackService';
import { getCurrentUser } from '../services/authService';
import './PostConversationFeedbackModal.css';

const FEELING_OPTIONS = [
  { id: 'felt_like_me', label: 'It felt like me', emoji: '❤️' },
  { id: 'pretty_close', label: 'Pretty close', emoji: '🙂' },
  { id: 'not_quite', label: 'Not quite', emoji: '😐' },
  { id: 'didnt_feel_like_me', label: "Didn't feel like me", emoji: '🙁' },
];

const TALK_AGAIN_OPTIONS = ['Yes', 'Maybe', 'No'];

export default function PostConversationFeedbackModal({
  isOpen,
  onClose,
  avatar,
  onFeedbackSaved,
}) {
  const currentUser = getCurrentUser();
  const [selectedFeeling, setSelectedFeeling] = useState('felt_like_me');
  const [improvements, setImprovements] = useState('');
  const [talkAgain, setTalkAgain] = useState('Yes');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const callingName = avatar?.callingName || avatar?.name?.split(' ')[0] || 'your KIN';

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);

    try {
      await saveFeedback({
        userId: currentUser?.id || 'guest-beta',
        avatarId: avatar?.id || 'general',
        kinFeeling: selectedFeeling,
        improvements,
        talkAgain,
      });

      setIsSubmitted(true);
      setTimeout(() => {
        if (onFeedbackSaved) onFeedbackSaved();
        if (onClose) onClose();
      }, 1400);
    } catch (err) {
      console.error('Feedback submit error:', err);
      if (onClose) onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="feedback-modal-backdrop" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="feedback-modal-card"
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={onClose} className="feedback-close-btn" aria-label="Close">
            <X size={16} />
          </button>

          {!isSubmitted ? (
            <div className="feedback-content-wrap">
              <div className="feedback-header">
                <div className="feedback-icon-pill">
                  <Heart size={14} className="text-rose-500 fill-rose-500/20" />
                  <span>First Session Reflection</span>
                </div>
                <h3 className="feedback-modal-title">How did speaking with {callingName} feel?</h3>
                <p className="feedback-modal-sub">
                  Your feedback shapes our living memory calibration and vocal nuance models during this private beta.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="feedback-form-body">
                {/* Question 1: How did KIN feel? */}
                <div className="feedback-question-group">
                  <label className="question-label">How did KIN feel?</label>
                  <div className="feelings-grid">
                    {FEELING_OPTIONS.map((opt) => (
                      <button
                        type="button"
                        key={opt.id}
                        onClick={() => setSelectedFeeling(opt.id)}
                        className={`feeling-choice-btn ${selectedFeeling === opt.id ? 'active' : ''}`}
                      >
                        <span className="choice-emoji">{opt.emoji}</span>
                        <span className="choice-text">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question 2: What could be better? */}
                <div className="feedback-question-group">
                  <label htmlFor="fb-improvements" className="question-label">
                    What could be better? <span className="subtle-note">(Optional)</span>
                  </label>
                  <textarea
                    id="fb-improvements"
                    rows={2}
                    placeholder="e.g. Vocal pacing, conversational warmth, knowledge of specific family memories..."
                    value={improvements}
                    onChange={(e) => setImprovements(e.target.value)}
                  />
                </div>

                {/* Question 3: Would you talk to your KIN again? */}
                <div className="feedback-question-group">
                  <label className="question-label">Would you talk to your KIN again?</label>
                  <div className="talk-again-chips">
                    {TALK_AGAIN_OPTIONS.map((opt) => (
                      <button
                        type="button"
                        key={opt}
                        onClick={() => setTalkAgain(opt)}
                        className={`talk-chip-btn ${talkAgain === opt ? 'active' : ''}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="feedback-actions-bar">
                  <button type="button" onClick={onClose} className="skip-fb-btn">
                    Skip for Now
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="submit-fb-btn"
                  >
                    {isSubmitting ? 'Saving...' : 'Submit Reflection'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="feedback-success-state">
              <div className="success-icon-wrap">
                <CheckCircle2 size={36} className="text-emerald-600" />
              </div>
              <h4>Thank you for your reflection</h4>
              <p>Your impressions help calibrate KIN's emotional resonance and voice precision.</p>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
