/**
 * auth.js - Authentication & Role/Consent Gate Middleware
 */
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');
const Consent = require('../models/Consent');

const ACTIVE_CONSENT_VERSION = 'KIN-BETA-1.0';

/**
 * Validates JWT Bearer Token and attaches req.user
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication token required.',
        },
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch (jwtErr) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Session token has expired or is invalid.',
        },
      });
    }

    let user = null;
    try {
      user = await User.findById(decoded.id);
    } catch (dbErr) {
      // In unlinked / offline mode, construct fallback user object from token
      user = null;
    }

    if (!user) {
      // Allow valid token payload if DB is offline or mock user session
      req.user = {
        _id: decoded.id,
        id: decoded.id,
        email: decoded.email,
        role: decoded.role || 'beta_user',
        status: decoded.status || 'approved',
        name: decoded.name || 'User',
      };
    } else {
      req.user = user;
    }

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Optional Authentication: Attaches req.user if a valid token is present
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, config.jwtSecret);
        let user = null;
        try {
          user = await User.findById(decoded.id);
        } catch (e) {}

        req.user = user || {
          _id: decoded.id,
          id: decoded.id,
          email: decoded.email,
          role: decoded.role || 'beta_user',
          status: decoded.status || 'approved',
          name: decoded.name || 'User',
        };
      } catch (e) {}
    }
    next();
  } catch (err) {
    next();
  }
}

/**
 * Enforces that user is an approved beta participant
 */
function requireBetaApproved(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
    });
  }

  if (req.user.role === 'admin') {
    return next();
  }

  if (req.user.status !== 'approved') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'BETA_ACCESS_REQUIRED',
        message: 'Your beta application is currently pending or has not been approved.',
      },
    });
  }

  next();
}

/**
 * Enforces that user has accepted KIN-BETA-1.0 consent before proceeding
 */
async function requireConsent(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
    });
  }

  if (req.user.role === 'admin') {
    return next();
  }

  try {
    const consent = await Consent.findOne({
      userId: req.user._id,
      consentVersion: ACTIVE_CONSENT_VERSION,
      consentGiven: true,
    });

    if (!consent) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'CONSENT_REQUIRED',
          message: 'You must review and accept the KIN-BETA-1.0 Informed Consent Agreement before proceeding.',
          consentVersion: ACTIVE_CONSENT_VERSION,
        },
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Enforces admin role
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Administrator privileges required.',
      },
    });
  }
  next();
}

module.exports = {
  requireAuth,
  optionalAuth,
  requireBetaApproved,
  requireConsent,
  requireAdmin,
  ACTIVE_CONSENT_VERSION,
};
