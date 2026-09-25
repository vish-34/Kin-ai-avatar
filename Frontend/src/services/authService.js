/**
 * authService.js - Frontend Mock Authentication Service
 * 
 * Manages user authentication sessions for the KIN Beta Program.
 * Currently uses localStorage mock storage.
 * 
 * FUTURE BACKEND INTEGRATION:
 * Replace mock storage with Express API calls:
 * - login: POST /api/auth/login
 * - logout: POST /api/auth/logout
 * - getCurrentUser: GET /api/auth/me
 */

import { trackEvent } from './analyticsService';

const AUTH_STORAGE_KEY = 'kin_beta_auth_session';

// Pre-seeded mock beta participants for testing
export const MOCK_USERS = [
  {
    id: 'beta-001',
    name: 'Vishal Sharma',
    email: 'beta@example.com',
    password: 'password123',
    role: 'beta_user',
    approved: true,
    consented: true, // Has already accepted KIN-BETA-1.0
  },
  {
    id: 'beta-002',
    name: 'Aarav Patel',
    email: 'newbeta@example.com',
    password: 'password123',
    role: 'beta_user',
    approved: true,
    consented: false, // Needs to complete consent agreement
  },
  {
    id: 'admin-001',
    name: 'KIN Administrator',
    email: 'admin@kin.ai',
    password: 'admin123',
    role: 'admin',
    approved: true,
    consented: true,
  },
];

/**
 * Authenticate a beta user with email and password
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<{ user: Object, token: string }>}
 */
export async function login(email, password) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPassword = (password || '').trim();

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password: cleanPassword }),
    });

    if (res.ok) {
      const data = await res.json();
      const session = {
        user: data.user,
        token: data.token,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      };

      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
      } catch (err) {
        console.error('Failed to store auth session:', err);
      }

      trackEvent('login', { userId: data.user.id, role: data.user.role });
      return session;
    } else {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Invalid email or password. Please use approved beta credentials.');
    }
  } catch (apiErr) {
    // If backend unreachable and not in production, attempt local mock fallback
    if (process.env.NODE_ENV !== 'production' && apiErr.message.includes('fetch')) {
      console.warn('[Auth Service] Backend offline, checking local mock credentials...');
      const matchedMock = MOCK_USERS.find(
        (u) => u.email.toLowerCase() === cleanEmail && u.password === cleanPassword
      );
      if (matchedMock) {
        const session = {
          user: {
            id: matchedMock.id,
            name: matchedMock.name,
            email: matchedMock.email,
            role: matchedMock.role,
            approved: matchedMock.approved,
          },
          token: `mock-token-${matchedMock.id}-${Date.now()}`,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        };
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
        trackEvent('login', { userId: matchedMock.id, role: matchedMock.role });
        return session;
      }
    }
    throw apiErr;
  }
}

/**
 * End current user session
 * Note: Logout does NOT delete KIN data or avatars.
 */
export function logout() {
  const current = getCurrentUser();
  if (current) {
    trackEvent('logout', { userId: current.id });
  }
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear auth session:', err);
  }
}

/**
 * Get the currently logged-in user object or null
 * @returns {Object|null}
 */
export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (session.expiresAt && Date.now() > session.expiresAt) {
      logout();
      return null;
    }
    return session.user || null;
  } catch {
    return null;
  }
}

/**
 * Check if a valid session exists
 * @returns {boolean}
 */
export function isAuthenticated() {
  return getCurrentUser() !== null;
}

/**
 * Check if current user is an administrator
 * @returns {boolean}
 */
export function isAdmin() {
  const user = getCurrentUser();
  return Boolean(user && user.role === 'admin');
}

/**
 * Get active auth token (for future Authorization headers)
 * @returns {string|null}
 */
export function getAuthToken() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    return session.token || null;
  } catch {
    return null;
  }
}
