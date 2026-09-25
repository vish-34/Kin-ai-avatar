/**
 * beta.controller.js - Beta Cohort Application Submission & Moderation
 */
const BetaApplication = require('../models/BetaApplication');

// Preseeded applications for demo review if DB collection is empty
const DEMO_APPLICATIONS = [
  {
    name: 'Ananya Deshmukh',
    email: 'ananya.deshmukh@gmail.com',
    country: 'India',
    ageRange: '25–34',
    profession: 'Architectural Historian',
    interestReason: 'My grandmother passed away last winter. I have 120+ voice notes and letters from her and want to create a dialogue space for our younger cousins.',
    preservationGoal: 'Preserving her culinary memories and wisdom regarding joint family heritage.',
    acquisitionSource: 'LinkedIn',
    willingnessToTest: 'Yes',
    status: 'approved',
  },
  {
    name: 'Marcus Sterling',
    email: 'marcus.sterling@outlook.co.uk',
    country: 'United Kingdom',
    ageRange: '45–54',
    profession: 'Software Engineer',
    interestReason: 'Fascinated by voice cloning and memory synthesis. Want to preserve my father’s storytelling style.',
    preservationGoal: 'Preserve my father’s humor and bedtime stories.',
    acquisitionSource: 'X / Twitter',
    willingnessToTest: 'Yes',
    status: 'pending',
  },
];

/**
 * POST /api/beta/applications
 */
async function submitApplication(req, res, next) {
  try {
    const {
      name,
      email,
      country,
      ageRange,
      profession,
      interestReason,
      preservationGoal,
      acquisitionSource,
      willingnessToTest,
    } = req.body;

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
      if (!req.body[field] || !String(req.body[field]).trim()) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: `Field "${field}" is required.` },
        });
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_EMAIL', message: 'Please provide a valid email address.' },
      });
    }

    const application = await BetaApplication.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      country: country.trim(),
      ageRange,
      profession: profession?.trim() || 'Not specified',
      interestReason: interestReason.trim(),
      preservationGoal: preservationGoal?.trim() || 'Family living memory',
      acquisitionSource,
      willingnessToTest,
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      application,
      message: 'Application submitted successfully. Our team will review your application soon.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/beta/applications
 */
async function getApplications(req, res, next) {
  try {
    let list = await BetaApplication.find().sort({ createdAt: -1 });
    if (list.length === 0) {
      // Seed demo applications
      list = await BetaApplication.insertMany(DEMO_APPLICATIONS);
    }

    res.json({
      success: true,
      applications: list,
      count: list.length,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/beta/applications/:id
 */
async function updateApplicationStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'approved', 'rejected', 'contacted'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: `Status must be one of: ${validStatuses.join(', ')}` },
      });
    }

    const app = await BetaApplication.findByIdAndUpdate(
      id,
      {
        status,
        reviewedBy: req.user?._id || null,
        reviewedAt: new Date(),
      },
      { new: true }
    );

    if (!app) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Beta application not found.' },
      });
    }

    res.json({
      success: true,
      application: app,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  submitApplication,
  getApplications,
  updateApplicationStatus,
};
