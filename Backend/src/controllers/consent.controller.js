/**
 * consent.controller.js - KIN Beta Informed Consent Persistence & Verification
 */
const Consent = require('../models/Consent');
const { ACTIVE_CONSENT_VERSION } = require('../middleware/auth');

/**
 * POST /api/consent
 */
async function recordConsent(req, res, next) {
  try {
    const userId = req.body.userId || (req.user ? req.user._id || req.user.id : null);
    const consentVersion = req.body.consentVersion || ACTIVE_CONSENT_VERSION;
    const checkboxStates = req.body.checkboxStates || {};

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'userId is required to record consent.' },
      });
    }

    const confirmedCount = Object.keys(checkboxStates).filter((k) => checkboxStates[k]).length;

    const consent = await Consent.findOneAndUpdate(
      { userId, consentVersion },
      {
        consentGiven: true,
        consentVersion,
        consentedAt: new Date(),
        checkboxesConfirmed: confirmedCount,
        metadata: { checkboxStates },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({
      success: true,
      consent: {
        userId: consent.userId.toString(),
        consentGiven: consent.consentGiven,
        consentVersion: consent.consentVersion,
        consentedAt: consent.consentedAt,
        checkboxesConfirmed: consent.checkboxesConfirmed,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/consent/:userId
 */
async function getConsentStatus(req, res, next) {
  try {
    const { userId } = req.params;
    const consent = await Consent.findOne({
      userId,
      consentVersion: ACTIVE_CONSENT_VERSION,
      consentGiven: true,
    });

    if (!consent) {
      return res.json({
        success: true,
        consented: false,
        consentVersion: ACTIVE_CONSENT_VERSION,
      });
    }

    res.json({
      success: true,
      consented: true,
      consent: {
        userId: consent.userId.toString(),
        consentGiven: consent.consentGiven,
        consentVersion: consent.consentVersion,
        consentedAt: consent.consentedAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  recordConsent,
  getConsentStatus,
};
