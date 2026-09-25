import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ShieldCheck,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Info,
  KeyRound,
} from 'lucide-react';
import { login, MOCK_USERS } from '../services/authService';
import { hasConsented } from '../services/consentService';
import './LoginPage.css';

export default function LoginPage({
  onLoginSuccess,
  onBackToHome,
  onNavigateToJoinBeta,
  redirectTarget = null,
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      const session = await login(email, password);
      const user = session.user;

      if (onLoginSuccess) {
        onLoginSuccess(user, redirectTarget);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Invalid credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoFill = (mockUser) => {
    setEmail(mockUser.email);
    setPassword(mockUser.password);
    setErrorMessage('');
  };

  return (
    <div className="login-page-root">
      {/* Top Header */}
      <header className="login-header-bar">
        <button onClick={onBackToHome} className="login-back-btn" aria-label="Back to Home">
          <ArrowLeft size={16} />
          <span>Back to KIN</span>
        </button>

        <div className="login-header-right">
          <span className="no-account-text">New to the beta program?</span>
          <button onClick={onNavigateToJoinBeta} className="login-header-apply-btn">
            Apply to Join
          </button>
        </div>
      </header>

      <main className="login-main-viewport">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="login-card-container"
        >
          {/* Header */}
          <div className="login-brand-header">
            <div className="login-icon-badge">
              <ShieldCheck size={20} className="text-emerald-600" />
            </div>
            <h1 className="login-heading">Beta Participant Sign In</h1>
            <p className="login-subtext">
              Enter your authorized beta credentials to access the KIN Creation Studio and Family Vault.
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="login-error-banner" role="alert">
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label htmlFor="login-email">Beta Email</label>
              <div className="input-icon-wrap">
                <Mail size={16} className="field-icon" />
                <input
                  id="login-email"
                  type="email"
                  placeholder="e.g. beta@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <div className="label-with-hint">
                <label htmlFor="login-password">Password</label>
              </div>
              <div className="input-icon-wrap">
                <Lock size={16} className="field-icon" />
                <input
                  id="login-password"
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="login-submit-btn">
              {isLoading ? (
                <span>Verifying Beta Credentials...</span>
              ) : (
                <>
                  <span>Enter KIN Workspace</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Quick Mock Auto-Fill Assist (Development / Prototype Testing) */}
          <div className="mock-credentials-card">
            <div className="mock-card-header">
              <KeyRound size={14} className="text-amber-600" />
              <span>Prototype Beta Accounts (Tap to Auto-fill)</span>
            </div>

            <div className="mock-accounts-list">
              {/* Account 1: Approved & Consented */}
              <button
                type="button"
                onClick={() => handleAutoFill(MOCK_USERS[0])}
                className="mock-user-chip"
                title="Approved Beta User with Consent already given"
              >
                <div className="mock-user-info">
                  <span className="mock-name">Approved Beta User (Consented)</span>
                  <span className="mock-email">{MOCK_USERS[0].email}</span>
                </div>
                <span className="mock-badge green">Ready for Studio</span>
              </button>

              {/* Account 2: Needs Consent Gate */}
              <button
                type="button"
                onClick={() => handleAutoFill(MOCK_USERS[1])}
                className="mock-user-chip"
                title="Approved Beta User who needs to sign Consent Agreement"
              >
                <div className="mock-user-info">
                  <span className="mock-name">New Beta User (Unconsented)</span>
                  <span className="mock-email">{MOCK_USERS[1].email}</span>
                </div>
                <span className="mock-badge amber">Tests Consent Gate</span>
              </button>

              {/* Account 3: Admin Reviewer */}
              <button
                type="button"
                onClick={() => handleAutoFill(MOCK_USERS[2])}
                className="mock-user-chip"
                title="Admin Account to review applicant cohort"
              >
                <div className="mock-user-info">
                  <span className="mock-name">KIN Administrator</span>
                  <span className="mock-email">{MOCK_USERS[2].email}</span>
                </div>
                <span className="mock-badge blue">Admin Dashboard</span>
              </button>
            </div>
          </div>

          <div className="login-footer-disclaimer">
            <Info size={13} className="text-slate-400" />
            <p>
              This is a private prototype beta. Real-world authentication will connect to the KIN Express
              API & MongoDB backend.
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
