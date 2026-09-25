/**
 * analyticsService.js - Centralized Frontend Analytics Event Dispatcher
 * 
 * Records core lifecycle and interaction events during the KIN Beta.
 * Currently writes to an internal in-memory and localStorage buffer.
 * 
 * FUTURE BACKEND INTEGRATION:
 * Replace or augment with Express analytics endpoint:
 * POST /api/analytics/events
 */

const ANALYTICS_STORAGE_KEY = 'kin_analytics_events';
const MAX_LOCAL_EVENTS = 150;

/**
 * Record a named analytics event
 * @param {string} eventName 
 * @param {Object} properties 
 */
export function trackEvent(eventName, properties = {}) {
  const payload = {
    event: eventName,
    properties,
    timestamp: new Date().toISOString(),
    epoch: Date.now(),
    path: window.location.hash || window.location.pathname || '/',
  };

  // Safe developer console logging
  if (process.env.NODE_ENV !== 'production') {
    console.info(`[KIN Analytics Event] -> ${eventName}`, properties);
  }

  try {
    const raw = localStorage.getItem(ANALYTICS_STORAGE_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    existing.push(payload);

    // Keep buffer capped to prevent unbounded storage growth
    const trimmed = existing.slice(-MAX_LOCAL_EVENTS);
    localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.warn('[Analytics Service] Failed to persist event locally:', err);
  }

  // Dispatch to backend API asynchronously
  try {
    const token = localStorage.getItem('kin_beta_auth_session')
      ? JSON.parse(localStorage.getItem('kin_beta_auth_session')).token
      : null;

    fetch('/api/analytics/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch (e) {}
}

/**
 * Retrieve recorded events for diagnostic / admin review
 * @returns {Array<Object>}
 */
export function getRecordedEvents() {
  try {
    const raw = localStorage.getItem(ANALYTICS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Clear locally recorded events
 */
export function clearRecordedEvents() {
  try {
    localStorage.removeItem(ANALYTICS_STORAGE_KEY);
  } catch {}
}
