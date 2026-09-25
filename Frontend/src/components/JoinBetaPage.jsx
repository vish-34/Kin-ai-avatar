import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  Send,
  Globe,
  User,
  Mail,
  Briefcase,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { submitBetaApplication } from '../services/betaService';
import './JoinBetaPage.css';

const AGE_RANGES = ['18–24', '25–34', '35–44', '45–54', '55+'];

const ACQUISITION_SOURCES = [
  'Instagram',
  'LinkedIn',
  'X / Twitter',
  'Reddit',
  'Friend',
  'College / University',
  'Other',
];

export default function JoinBetaPage({ onBackToHome, onNavigateToLogin }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    country: '',
    ageRange: '25–34',
    profession: '',
    interestReason: '',
    preservationGoal: '',
    acquisitionSource: 'LinkedIn',
    willingnessToTest: 'Yes',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedApplication, setSubmittedApplication] = useState(null);

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Full name is required.';
    if (!formData.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Please provide a valid email address.';
    }
    if (!formData.country.trim()) errs.country = 'Country is required.';
    if (!formData.ageRange) errs.ageRange = 'Please select an age range.';
    if (!formData.interestReason.trim()) {
      errs.interestReason = 'Please explain why you are interested in KIN.';
    } else if (formData.interestReason.trim().length < 15) {
      errs.interestReason = 'Please share at least a sentence explaining your interest.';
    }
    if (!formData.acquisitionSource) {
      errs.acquisitionSource = 'Please let us know how you heard about us.';
    }
    if (!formData.willingnessToTest) {
      errs.willingnessToTest = 'Please select an option for testing willingness.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      const firstKey = Object.keys(errors)[0];
      const el = document.getElementById(`field-${firstKey}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitBetaApplication(formData);
      setSubmittedApplication(result);
    } catch (err) {
      setErrors({ form: err.message || 'Submission failed. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="join-beta-page-root">
      {/* Top Breadcrumb & Navigation */}
      <header className="beta-subpage-header">
        <button onClick={onBackToHome} className="beta-back-btn" aria-label="Back to Home">
          <ArrowLeft size={16} />
          <span>Back to KIN</span>
        </button>

        <div className="beta-header-right">
          <span className="beta-login-prompt">Already have approved credentials?</span>
          <button onClick={onNavigateToLogin} className="beta-header-login-btn">
            Sign In
          </button>
        </div>
      </header>

      <main className="beta-form-container">
        <AnimatePresence mode="wait">
          {!submittedApplication ? (
            <motion.div
              key="beta-form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4 }}
              className="beta-form-wrapper"
            >
              {/* Header Badge & Title */}
              <div className="beta-title-block">
                <h1 className="beta-main-heading">Apply to Join the KIN Beta</h1>
                <p className="beta-subheading">
                  We are opening access to a select cohort of families, writers, and individuals
                  who wish to preserve living memory, voice, and personal wisdom with care and dignity.
                </p>
              </div>

              {errors.form && (
                <div className="beta-alert-box error" role="alert">
                  <AlertCircle size={16} />
                  <span>{errors.form}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="beta-actual-form">
                {/* Section 1: About You */}
                <div className="form-fieldset">
                  <div className="fieldset-header">
                    <span className="fieldset-num">01</span>
                    <h3>Participant Details</h3>
                  </div>

                  <div className="form-grid-two">
                    <div className="form-field-group" id="field-name">
                      <label htmlFor="input-name">
                        Full Name <span className="req-star">*</span>
                      </label>
                      <div className="input-with-icon">
                        <User size={16} className="input-icon" />
                        <input
                          id="input-name"
                          type="text"
                          placeholder="e.g. Maya Sharma"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className={errors.name ? 'has-error' : ''}
                        />
                      </div>
                      {errors.name && <span className="field-error-text">{errors.name}</span>}
                    </div>

                    <div className="form-field-group" id="field-email">
                      <label htmlFor="input-email">
                        Email Address <span className="req-star">*</span>
                      </label>
                      <div className="input-with-icon">
                        <Mail size={16} className="input-icon" />
                        <input
                          id="input-email"
                          type="email"
                          placeholder="name@example.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className={errors.email ? 'has-error' : ''}
                        />
                      </div>
                      {errors.email && <span className="field-error-text">{errors.email}</span>}
                    </div>
                  </div>

                  <div className="form-grid-two">
                    <div className="form-field-group" id="field-country">
                      <label htmlFor="input-country">
                        Country <span className="req-star">*</span>
                      </label>
                      <div className="input-with-icon">
                        <Globe size={16} className="input-icon" />
                        <input
                          id="input-country"
                          type="text"
                          placeholder="e.g. India, United States, United Kingdom"
                          value={formData.country}
                          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                          className={errors.country ? 'has-error' : ''}
                        />
                      </div>
                      {errors.country && <span className="field-error-text">{errors.country}</span>}
                    </div>

                    <div className="form-field-group" id="field-ageRange">
                      <label>
                        Age Range <span className="req-star">*</span>
                      </label>
                      <div className="age-pill-selector">
                        {AGE_RANGES.map((range) => (
                          <button
                            type="button"
                            key={range}
                            className={`age-pill-btn ${formData.ageRange === range ? 'selected' : ''}`}
                            onClick={() => setFormData({ ...formData, ageRange: range })}
                          >
                            {range}
                          </button>
                        ))}
                      </div>
                      {errors.ageRange && <span className="field-error-text">{errors.ageRange}</span>}
                    </div>
                  </div>

                  <div className="form-field-group">
                    <label htmlFor="input-profession">
                      Profession / Occupation <span className="optional-tag">(Optional)</span>
                    </label>
                    <div className="input-with-icon">
                      <Briefcase size={16} className="input-icon" />
                      <input
                        id="input-profession"
                        type="text"
                        placeholder="e.g. Designer, Teacher, Historian, Doctor"
                        value={formData.profession}
                        onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Intent & Memories */}
                <div className="form-fieldset">
                  <div className="fieldset-header">
                    <span className="fieldset-num">02</span>
                    <h3>Living Memory Intent</h3>
                  </div>

                  <div className="form-field-group" id="field-interestReason">
                    <label htmlFor="input-interest">
                      Why are you interested in KIN? <span className="req-star">*</span>
                    </label>
                    <textarea
                      id="input-interest"
                      rows={3}
                      placeholder="Tell us what draws you to living memory and whose voice or presence you wish to explore preserving..."
                      value={formData.interestReason}
                      onChange={(e) => setFormData({ ...formData, interestReason: e.target.value })}
                      className={errors.interestReason ? 'has-error' : ''}
                    />
                    {errors.interestReason && (
                      <span className="field-error-text">{errors.interestReason}</span>
                    )}
                  </div>

                  <div className="form-field-group">
                    <label htmlFor="input-preservation">
                      What would you want to preserve or create with KIN? <span className="optional-tag">(Optional)</span>
                    </label>
                    <textarea
                      id="input-preservation"
                      rows={2}
                      placeholder="e.g. My late grandmother's stories and advice for her grandchildren..."
                      value={formData.preservationGoal}
                      onChange={(e) => setFormData({ ...formData, preservationGoal: e.target.value })}
                    />
                  </div>

                  <div className="form-grid-two">
                    <div className="form-field-group" id="field-acquisitionSource">
                      <label htmlFor="select-source">
                        How did you hear about KIN? <span className="req-star">*</span>
                      </label>
                      <select
                        id="select-source"
                        value={formData.acquisitionSource}
                        onChange={(e) => setFormData({ ...formData, acquisitionSource: e.target.value })}
                        className="beta-select-input"
                      >
                        {ACQUISITION_SOURCES.map((source) => (
                          <option key={source} value={source}>
                            {source}
                          </option>
                        ))}
                      </select>
                      {errors.acquisitionSource && (
                        <span className="field-error-text">{errors.acquisitionSource}</span>
                      )}
                    </div>

                    <div className="form-field-group" id="field-willingnessToTest">
                      <label>
                        Would you be willing to create your own KIN and have a 10–15 minute conversation with it?{' '}
                        <span className="req-star">*</span>
                      </label>
                      <div className="willingness-radio-group">
                        {['Yes', 'Maybe', 'No'].map((opt) => (
                          <label
                            key={opt}
                            className={`willingness-chip ${formData.willingnessToTest === opt ? 'selected' : ''}`}
                          >
                            <input
                              type="radio"
                              name="willingnessToTest"
                              value={opt}
                              checked={formData.willingnessToTest === opt}
                              onChange={(e) => setFormData({ ...formData, willingnessToTest: e.target.value })}
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                      {errors.willingnessToTest && (
                        <span className="field-error-text">{errors.willingnessToTest}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Submit Action Bar */}
                <div className="beta-submit-bar">
                  <p className="privacy-micro-notice">
                    KIN treats your memories with complete confidentiality. Applications are reviewed
                    in accordance with our privacy-first manifesto.
                  </p>
                  <button type="submit" disabled={isSubmitting} className="beta-primary-submit-btn">
                    {isSubmitting ? (
                      <span>Submitting Application...</span>
                    ) : (
                      <>
                        <span>Submit Beta Application</span>
                        <Send size={15} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          ) : (
            /* Confirmation View */
            <motion.div
              key="beta-success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="beta-confirmation-card"
            >
              <div className="confirmation-icon-circle">
                <CheckCircle2 size={36} className="text-emerald-600" />
              </div>

              <div className="confirmation-badge">Application Status: Pending Review</div>

              <h2 className="confirmation-title">
                Thanks for your interest in KIN.
                <br />
                We've received your beta application.
              </h2>

              <p className="confirmation-body">
                We review applications continuously in small, deliberate batches to give each participant
                thoughtful support with voice cloning and memory calibration. If accepted for the upcoming
                cohort, we will send an onboarding invitation to <strong>{submittedApplication.email}</strong>.
              </p>

              <div className="confirmation-details-box">
                <div className="detail-row">
                  <span className="detail-label">Application ID:</span>
                  <span className="detail-val font-mono">{submittedApplication.id}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Applicant:</span>
                  <span className="detail-val">{submittedApplication.name} ({submittedApplication.country})</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Intent:</span>
                  <span className="detail-val truncate">{submittedApplication.interestReason}</span>
                </div>
              </div>

              <div className="confirmation-actions">
                <button onClick={onBackToHome} className="confirm-home-btn">
                  <span>Return to Home</span>
                </button>

                <button onClick={onNavigateToLogin} className="confirm-login-btn">
                  <span>Beta Sign In</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
