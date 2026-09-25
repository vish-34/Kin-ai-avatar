/**
 * betaService.js - Beta Program Application & Cohort Service
 * 
 * Manages public beta applications and admin review.
 * Currently uses localStorage mock storage.
 * 
 * FUTURE BACKEND INTEGRATION:
 * Replace with Express/MongoDB endpoints:
 * - submitBetaApplication: POST /api/beta/applications
 * - getBetaApplications: GET /api/beta/applications (Admin protected)
 * - updateApplicationStatus: PATCH /api/beta/applications/:id
 */

import { trackEvent } from './analyticsService';

const BETA_APPS_KEY = 'kin_beta_applications';

// Pre-seeded realistic demo applications to showcase admin moderation
const DEFAULT_APPLICATIONS = [
  {
    id: 'app-101',
    name: 'Ananya Deshmukh',
    email: 'ananya.deshmukh@gmail.com',
    country: 'India',
    ageRange: '25–34',
    profession: 'Architectural Historian',
    interestReason: 'My grandmother passed away last winter. I have 120+ voice notes and letters from her and want to create a dialogue space for our younger cousins.',
    preservationGoal: 'Preserving her culinary memories and wisdom regarding joint family heritage.',
    acquisitionSource: 'LinkedIn',
    willingnessToTest: 'Yes',
    submittedAt: '2026-09-20T14:32:00.000Z',
    status: 'approved',
  },
  {
    id: 'app-102',
    name: 'Marcus Sterling',
    email: 'marcus.sterling@outlook.co.uk',
    country: 'United Kingdom',
    ageRange: '45–54',
    profession: 'Software Engineer',
    interestReason: 'Fascinated by voice cloning and memory synthesis. Want to preserve my father’s storytelling style.',
    preservationGoal: 'Preserve my father’s humor and bedtime stories.',
    acquisitionSource: 'X / Twitter',
    willingnessToTest: 'Yes',
    submittedAt: '2026-09-22T09:15:00.000Z',
    status: 'pending',
  },
  {
    id: 'app-103',
    name: 'Elena Rostova',
    email: 'elena.rostova@berlin-tech.de',
    country: 'Germany',
    ageRange: '35–44',
    profession: 'Researcher',
    interestReason: 'Looking at how conversational AI affects grief processing and family bonding.',
    preservationGoal: 'Documenting multi-generational family memoirs.',
    acquisitionSource: 'Reddit',
    willingnessToTest: 'Maybe',
    submittedAt: '2026-09-23T18:45:00.000Z',
    status: 'contacted',
  },
  {
    id: 'app-104',
    name: 'Devraj Sen',
    email: 'devraj.sen@kolkata.in',
    country: 'India',
    ageRange: '18–24',
    profession: 'Student',
    interestReason: 'Want to make an avatar of my grandfather who was a classical musician.',
    preservationGoal: 'Music anecdotes and classical ragas discussions.',
    acquisitionSource: 'Friend',
    willingnessToTest: 'Yes',
    submittedAt: '2026-09-24T11:10:00.000Z',
    status: 'pending',
  },
];

/**
 * Initialize default applications if not yet set
 */
function ensureStorage() {
  try {
    const raw = localStorage.getItem(BETA_APPS_KEY);
    if (!raw) {
      localStorage.setItem(BETA_APPS_KEY, JSON.stringify(DEFAULT_APPLICATIONS));
      return DEFAULT_APPLICATIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_APPLICATIONS;
  } catch {
    return DEFAULT_APPLICATIONS;
  }
}

/**
 * Submit a new Beta Application
 * @param {Object} data 
 * @returns {Promise<Object>}
 */
export async function submitBetaApplication(data) {
  // Validate required fields
  const required = [
    'name',
    'email',
    'country',
    'ageRange',
    'interestReason',
    'acquisitionSource',
    'willingnessToTest',
  ];

  for (const field of required) {
    if (!data[field] || !String(data[field]).trim()) {
      throw new Error(`Field "${field}" is required.`);
    }
  }

  // Basic email pattern check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    throw new Error('Please enter a valid email address.');
  }

  try {
    const res = await fetch('/api/beta/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const result = await res.json();
      trackEvent('beta_application_submitted', {
        country: data.country,
        ageRange: data.ageRange,
        acquisitionSource: data.acquisitionSource,
      });
      return result.application || result;
    } else {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to submit beta application.');
    }
  } catch (apiErr) {
    if (process.env.NODE_ENV !== 'production' && apiErr.message.includes('fetch')) {
      const application = {
        id: `beta-app-${Date.now()}`,
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        country: data.country.trim(),
        ageRange: data.ageRange,
        profession: data.profession?.trim() || 'Not specified',
        interestReason: data.interestReason.trim(),
        preservationGoal: data.preservationGoal?.trim() || 'Family living memory',
        acquisitionSource: data.acquisitionSource,
        willingnessToTest: data.willingnessToTest,
        submittedAt: new Date().toISOString(),
        status: 'pending',
      };
      const current = ensureStorage();
      const updated = [application, ...current];
      localStorage.setItem(BETA_APPS_KEY, JSON.stringify(updated));
      trackEvent('beta_application_submitted', {
        country: application.country,
        ageRange: application.ageRange,
        acquisitionSource: application.acquisitionSource,
      });
      return application;
    }
    throw apiErr;
  }
}

/**
 * Retrieve all beta applications (for admin view)
 * @returns {Promise<Array<Object>>|Array<Object>}
 */
export async function getBetaApplications() {
  try {
    const token = localStorage.getItem('kin_beta_auth_session')
      ? JSON.parse(localStorage.getItem('kin_beta_auth_session')).token
      : null;

    const res = await fetch('/api/beta/applications', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.applications)) {
        localStorage.setItem(BETA_APPS_KEY, JSON.stringify(data.applications));
        return data.applications;
      }
    }
  } catch (e) {}
  return ensureStorage();
}

/**
 * Update the review status of an application
 * @param {string} appId 
 * @param {'pending'|'approved'|'rejected'|'contacted'} newStatus 
 * @returns {Promise<Array<Object>>}
 */
export async function updateApplicationStatus(appId, newStatus) {
  try {
    const token = localStorage.getItem('kin_beta_auth_session')
      ? JSON.parse(localStorage.getItem('kin_beta_auth_session')).token
      : null;

    await fetch(`/api/beta/applications/${encodeURIComponent(appId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ status: newStatus }),
    });
  } catch (e) {}

  const current = ensureStorage();
  const updated = current.map((app) =>
    (app.id === appId || app._id === appId) ? { ...app, status: newStatus } : app
  );
  try {
    localStorage.setItem(BETA_APPS_KEY, JSON.stringify(updated));
  } catch (e) {}
  return updated;
}
