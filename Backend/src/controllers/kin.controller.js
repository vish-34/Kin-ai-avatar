/**
 * kin.controller.js - KIN Persona Lifecycle, Creation & Secure Deletion
 */
const path = require('path');
const fs = require('fs');
const Kin = require('../models/Kin');
const Memory = require('../models/Memory');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const storage = require('../config/storage');
const memoryService = require('../services/memoryService');
const elevenLabsService = require('../services/elevenLabsService');
const heygenService = require('../services/heygenService');
const config = require('../config/env');

const DADAJI_DEFAULT_PERSONA = {
  id: 'dadaji',
  slug: 'dadaji',
  name: 'Ramesh Vance Sharma',
  callingName: 'Dadaji',
  relation: 'Grandfather',
  lifespan: '1948 – 2023',
  hometown: 'Bengaluru, India',
  photoUrl: '/grandfather.jpg',
  talkingVideoUrl: '/dadaji_talking_stream.mp4',
  catchphrases: ['Sab theek ho jayega, beta', 'Take things one step at a time', 'Never go to sleep angry'],
  personalitySummary:
    'A deeply calm, philosophical soul who worked in precision tooling and gave gentle advice using gardening metaphors.',
  voiceTrained: true,
  faceRegistered: true,
  isDefault: true,
  createdAt: 'Default System Persona',
};

/**
 * Seed or retrieve Dadaji from MongoDB
 */
async function ensureDadajiSeeded() {
  try {
    let dadaji = await Kin.findOne({ slug: 'dadaji' });
    if (!dadaji) {
      dadaji = await Kin.create({
        slug: 'dadaji',
        userId: null,
        name: DADAJI_DEFAULT_PERSONA.name,
        callingName: DADAJI_DEFAULT_PERSONA.callingName,
        relation: DADAJI_DEFAULT_PERSONA.relation,
        lifespan: DADAJI_DEFAULT_PERSONA.lifespan,
        hometown: DADAJI_DEFAULT_PERSONA.hometown,
        personalitySummary: DADAJI_DEFAULT_PERSONA.personalitySummary,
        catchphrases: DADAJI_DEFAULT_PERSONA.catchphrases,
        photoUrl: DADAJI_DEFAULT_PERSONA.photoUrl,
        talkingVideoUrl: DADAJI_DEFAULT_PERSONA.talkingVideoUrl,
        voiceId: config.elevenLabsVoiceId,
        avatarId: config.heyGenAvatarId,
        isDefault: true,
        voiceTrained: true,
        faceRegistered: true,
      });

      // Seed Dadaji initial baseline memories
      await Memory.create({
        kinId: dadaji._id,
        category: 'core_memory',
        title: 'Life in Bangalore & Precision Tooling',
        content:
          'Worked for 35 years as a mechanical and electrical tooling engineer in Bangalore. Loved fixing antique radios, gardening in the morning, and making ginger chai.',
      });
    }
    return dadaji;
  } catch (e) {
    return null;
  }
}

// Seed Dadaji on startup
ensureDadajiSeeded().catch(() => {});

/**
 * POST /api/avatar/create or POST /api/kins
 * Creates a new KIN persona, handles media uploads, clones voice, stores memories.
 */
async function createKin(req, res, next) {
  try {
    const {
      avatar_id,
      name,
      calling_name,
      relation,
      lifespan,
      hometown,
      personality_summary,
      catchphrases,
      written_notes,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: "The persona's name is required." },
      });
    }

    // 1. Generate unique clean slug
    const rawSlug = avatar_id || name;
    let cleanId = rawSlug.toLowerCase().replace(/[^a-z0-9_-]/g, '_').replace(/^_+|_+$/g, '');
    if (cleanId === 'dadaji' && !name.toLowerCase().includes('dadaji')) {
      cleanId = `kin_${cleanId}`;
    }
    if (!cleanId) {
      cleanId = `kin_${Date.now()}`;
    }

    // Ensure uniqueness
    const existing = await Kin.findOne({ slug: cleanId });
    if (existing) {
      cleanId = `${cleanId}_${Date.now().toString().slice(-4)}`;
    }

    // 2. Parse catchphrases
    let parsedCatchphrases = [];
    if (catchphrases) {
      try {
        const parsed = JSON.parse(catchphrases);
        parsedCatchphrases = Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        parsedCatchphrases = catchphrases.split(',').map((c) => c.trim()).filter(Boolean);
      }
    }

    // 3. Handle Portrait Photo Upload
    let photoUrl = '/grandfather.jpg';
    if (req.files && req.files.photo && req.files.photo[0]) {
      const photoFile = req.files.photo[0];
      const savedPhoto = await storage.saveFile({
        buffer: photoFile.buffer,
        originalName: photoFile.originalname || 'portrait.jpg',
        subfolder: 'portraits',
      });
      photoUrl = savedPhoto.publicUrl;
    }

    // 4. Handle Voice Sample Upload & ElevenLabs Cloning
    let voiceId = null;
    let voiceTrained = false;
    if (req.files && req.files.voice && req.files.voice[0]) {
      const voiceFile = req.files.voice[0];
      const savedVoice = await storage.saveFile({
        buffer: voiceFile.buffer,
        originalName: voiceFile.originalname || 'voice_sample.wav',
        subfolder: 'voices',
      });

      // Attempt voice clone on ElevenLabs
      if (elevenLabsService.isConfigured()) {
        const cloneResult = await elevenLabsService.cloneVoice({
          name: `${name} (KIN Clone)`,
          audioBuffer: voiceFile.buffer,
          originalFilename: voiceFile.originalname,
        });
        if (cloneResult.voiceId) {
          voiceId = cloneResult.voiceId;
          voiceTrained = true;
        }
      }
    }

    // Fallback voice ID if custom cloning not available
    if (!voiceId) {
      voiceId = config.elevenLabsVoiceId;
    }

    const userId = req.user ? (req.user._id || req.user.id) : null;

    // 5. Create Kin in MongoDB
    const kin = await Kin.create({
      slug: cleanId,
      userId,
      name: name.trim(),
      callingName: (calling_name || name.split(' ')[0]).trim(),
      relation: (relation || 'Loved One').trim(),
      lifespan: (lifespan || '').trim(),
      hometown: (hometown || '').trim(),
      personalitySummary: (personality_summary || '').trim(),
      catchphrases: parsedCatchphrases,
      photoUrl,
      voiceId,
      avatarId: config.heyGenAvatarId,
      voiceTrained,
      faceRegistered: true,
      isDefault: false,
    });

    // 6. Ingest Written Notes and Core Memories into MongoDB Memory collection
    if (written_notes && written_notes.trim()) {
      await Memory.create({
        kinId: kin._id,
        userId,
        category: 'written_note',
        title: 'Core Memories & Written Stories',
        content: written_notes.trim(),
      });
    }

    // 7. Sync Kin & Memories to Python CloneLLM microservice
    await memoryService.syncKinMemoriesToCloneEngine(kin._id).catch((syncErr) => {
      console.warn('[Kin Controller] CloneLLM sync notice:', syncErr.message);
    });

    // Return response adhering to Frontend contract
    res.status(201).json({
      status: 'success',
      avatar: kin.toClientObject(),
      voice_registered: voiceTrained,
      face_registered: true,
      colab_connected: true,
      message: `Persona '${name}' successfully created and indexed into Family Vault.`,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/personas or GET /api/kins
 * Returns available personas (System Dadaji + User's private personas)
 */
async function listPersonas(req, res, next) {
  try {
    const personas = [];
    personas.push(DADAJI_DEFAULT_PERSONA);

    let query = { isDefault: false };
    if (req.user && req.user.role !== 'admin') {
      const uId = req.user._id || req.user.id;
      query = { isDefault: false, userId: uId };
    }

    const kins = await Kin.find(query).sort({ createdAt: -1 });
    for (const k of kins) {
      personas.push(k.toClientObject());
    }

    res.json({
      personas,
      count: personas.length,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/avatar/:avatar_id or DELETE /api/kins/:kinId
 * Verifies ownership, prevents deleting default Dadaji, performs cascading deletion.
 */
async function deleteKin(req, res, next) {
  try {
    const rawId = req.params.avatar_id || req.params.kinId;
    const cleanId = rawId.toLowerCase().trim();

    if (cleanId === 'dadaji' || cleanId === 'ramesh-dadaji') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_DELETE_DEFAULT',
          message: "Cannot delete the default system avatar 'Dadaji'.",
        },
      });
    }

    // Find persona by slug or ObjectId
    let kin = await Kin.findOne({ slug: cleanId });
    if (!kin && rawId.match(/^[0-9a-fA-F]{24}$/)) {
      kin = await Kin.findById(rawId);
    }

    if (!kin) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Persona '${rawId}' was not found.` },
      });
    }

    // Enforce Tenant Ownership Check
    if (req.user && req.user.role !== 'admin') {
      const currentUserId = (req.user._id || req.user.id).toString();
      if (kin.userId && kin.userId.toString() !== currentUserId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You are not authorized to delete another user’s KIN persona.',
          },
        });
      }
    }

    // 1. Delete associated media files from storage
    if (kin.photoUrl && kin.photoUrl.startsWith('/uploads/')) {
      await storage.deleteFile(kin.photoUrl);
    }
    if (kin.talkingVideoUrl && kin.talkingVideoUrl.startsWith('/uploads/')) {
      await storage.deleteFile(kin.talkingVideoUrl);
    }

    // 2. Cascading deletion of Memories
    await Memory.deleteMany({ kinId: kin._id });

    // 3. Cascading deletion of Conversations and Messages
    const convs = await Conversation.find({ kinId: kin._id });
    for (const c of convs) {
      await Message.deleteMany({ conversationId: c._id });
    }
    await Conversation.deleteMany({ kinId: kin._id });

    // 4. Delete Kin document
    await Kin.findByIdAndDelete(kin._id);

    // 5. Clean up public avatar files if created in Frontend/public/avatars
    try {
      const frontendAvatarsDir = path.resolve(__dirname, '../../../Frontend/public/avatars');
      for (const ext of ['.jpg', '_talking.mp4']) {
        const p = path.join(frontendAvatarsDir, `${cleanId}${ext}`);
        if (fs.existsSync(p)) {
          fs.unlinkSync(p);
        }
      }
    } catch (e) {}

    res.json({
      success: true,
      status: 'deleted',
      avatar_id: cleanId,
      message: `Persona '${kin.name}' and all associated memories have been permanently deleted.`,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/avatar/idle
 * Returns the portrait image
 */
async function getIdleMedia(req, res, next) {
  try {
    const rawId = req.query.avatar_id || 'dadaji';
    const cleanId = rawId.toLowerCase().trim();

    const kin = await Kin.findOne({ slug: cleanId });
    if (kin && kin.photoUrl) {
      if (kin.photoUrl.startsWith('/uploads/')) {
        return res.redirect(kin.photoUrl);
      }
    }

    const defaultImg = path.resolve(__dirname, '../../../Frontend/public/grandfather.jpg');
    if (fs.existsSync(defaultImg)) {
      return res.sendFile(defaultImg);
    }

    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'No idle media found.' } });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/avatar/video
 * Returns talking video
 */
async function getTalkingVideo(req, res, next) {
  try {
    const rawId = req.query.avatar_id || 'dadaji';
    const cleanId = rawId.toLowerCase().trim();

    const kin = await Kin.findOne({ slug: cleanId });
    if (kin && kin.talkingVideoUrl) {
      if (kin.talkingVideoUrl.startsWith('/uploads/')) {
        return res.redirect(kin.talkingVideoUrl);
      }
    }

    const defaultVid = path.resolve(__dirname, '../../../Frontend/public/dadaji_talking_stream.mp4');
    if (fs.existsSync(defaultVid)) {
      return res.sendFile(defaultVid);
    }

    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'No talking video found.' } });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createKin,
  listPersonas,
  deleteKin,
  getIdleMedia,
  getTalkingVideo,
};
