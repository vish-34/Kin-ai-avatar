/**
 * feedbackService.js - First Conversation Qualitative Feedback Service
 * 
 * Manages post-conversation feedback collection after the user's
 * first meaningful session with KIN.
 * 
 * FUTURE BACKEND INTEGRATION:
 * Replace with Express endpoint:
 * POST /api/feedback
 */

import { trackEvent } from './analyticsService';

const FEEDBACK_STORAGE_KEY = 'kin_beta_conversation_feedback';

/**
 * Check if the user has already submitted feedback
 * @param {string} userId 
 * @returns {boolean}
 */
export function hasSubmittedFeedback(userId = 'default') {
  try {
    const raw = localStorage.getItem(FEEDBACK_STORAGE_KEY);
    if (!raw) return false;
    const list = JSON.parse(raw);
    return Array.isArray(list) && list.some((item) => item.userId === userId);
  } catch {
    return false;
  }
}

/**
 * Save user feedback after their conversation
 * @param {Object} feedbackData
 * @param {string} feedbackData.userId
 * @param {string} feedbackData.avatarId
 * @param {string} feedbackData.kinFeeling - 'felt_like_me' | 'pretty_close' | 'not_quite' | 'didnt_feel_like_me'
 * @param {string} [feedbackData.improvements]
 * @param {string} feedbackData.talkAgain - 'Yes' | 'Maybe' | 'No'
 * @returns {Promise<Object>}
 */
export async function saveFeedback(feedbackData) {
  const record = {
    id: `fb-${Date.now()}`,
    userId: feedbackData.userId || 'guest',
    avatarId: feedbackData.avatarId || 'general',
    kinFeeling: feedbackData.kinFeeling,
    improvements: feedbackData.improvements?.trim() || '',
    talkAgain: feedbackData.talkAgain,
    createdAt: new Date().toISOString(),
  };

  try {
    const raw = localStorage.getItem(FEEDBACK_STORAGE_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    existing.push(record);
    localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(existing));
  } catch (err) {}

  // Sync to Backend Express API
  try {
    const token = localStorage.getItem('kin_beta_auth_session')
      ? JSON.parse(localStorage.getItem('kin_beta_auth_session')).token
      : null;

    await fetch('/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(record),
    });
  } catch (e) {
    console.warn('[Feedback Service] Notice: Could not sync feedback to backend API:', e.message);
  }

  trackEvent('feedback_submitted', {
    kinFeeling: record.kinFeeling,
    talkAgain: record.talkAgain,
  });

  return record;
}

/**
 * Get all submitted feedback records (for admin view)
 * @returns {Array<Object>}
 */
export function getAllFeedback() {
  try {
    const raw = localStorage.getItem(FEEDBACK_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
