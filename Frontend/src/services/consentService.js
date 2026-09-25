/**
 * consentService.js - KIN Beta Informed Consent & Agreement Manager
 * 
 * Manages consent version verification and storage.
 * A beta user must have consented to the active CONSENT_VERSION
 * before they can access the KIN Creation Studio.
 * 
 * FUTURE BACKEND INTEGRATION:
 * Replace with Express/MongoDB endpoints:
 * - saveConsent: POST /api/consent
 * - getConsent: GET /api/consent/:userId
 */

import { trackEvent } from './analyticsService';

export const CONSENT_VERSION = 'KIN-BETA-1.0';
const CONSENT_STORAGE_KEY = 'kin_beta_user_consent';

/**
 * Check if the specified user has consented to the current (or required) consent version
 * @param {string} userId 
 * @param {string} version 
 * @returns {boolean}
 */
export function hasConsented(userId, version = CONSENT_VERSION) {
  if (!userId) return false;
  try {
    const record = getConsent(userId);
    if (!record) return false;
    return Boolean(record.consentGiven && record.consentVersion === version);
  } catch {
    return false;
  }
}

/**
 * Retrieve the active consent record for a given user
 * @param {string} userId 
 * @returns {Object|null}
 */
export function getConsent(userId) {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw);
    return map[userId] || null;
  } catch {
    return null;
  }
}

/**
 * Persist consent record for a user
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} [params.consentVersion]
 * @param {Object} [params.checkboxStates]
 * @returns {Promise<Object>}
 */
export async function saveConsent({ userId, consentVersion = CONSENT_VERSION, checkboxStates = {} }) {
  if (!userId) {
    throw new Error('User ID is required to record consent.');
  }

  const record = {
    consentGiven: true,
    consentVersion,
    consentedAt: Date.now(),
    userId,
    checkboxesConfirmed: Object.keys(checkboxStates).length,
  };

  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[userId] = record;
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(map));
  } catch (err) {}

  // Sync to Backend Express API
  try {
    const token = localStorage.getItem('kin_beta_auth_session')
      ? JSON.parse(localStorage.getItem('kin_beta_auth_session')).token
      : null;

    await fetch('/api/consent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ userId, consentVersion, checkboxStates }),
    });
  } catch (e) {
    console.warn('[Consent Service] Notice: Could not sync consent to backend API:', e.message);
  }

  trackEvent('consent_accepted', {
    userId,
    consentVersion,
    consentedAt: record.consentedAt,
  });

  return record;
}

/**
 * Revoke or withdraw consent for a user
 * @param {string} userId 
 */
export function revokeConsent(userId) {
  if (!userId) return;
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return;
    const map = JSON.parse(raw);
    delete map[userId];
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(map));
    trackEvent('consent_revoked', { userId });
  } catch (err) {
    console.error('Failed to revoke consent locally:', err);
  }
}
