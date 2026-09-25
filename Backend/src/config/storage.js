/**
 * storage.js - Binary Media & Object Storage Abstraction
 * Handles persistent storage of portrait photos, voice samples, documents, and videos.
 * MongoDB stores the reference URL and metadata; this service stores the binary payload.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('./env');

const UPLOADS_DIR = config.storageDir;

function ensureDirectories() {
  const dirs = [
    UPLOADS_DIR,
    path.join(UPLOADS_DIR, 'portraits'),
    path.join(UPLOADS_DIR, 'voices'),
    path.join(UPLOADS_DIR, 'documents'),
    path.join(UPLOADS_DIR, 'videos'),
  ];
  for (const d of dirs) {
    if (!fs.existsSync(d)) {
      fs.mkdirSync(d, { recursive: true });
    }
  }
}

// Initialize directories on module load
ensureDirectories();

/**
 * Saves a binary buffer to persistent storage
 * @param {Object} params
 * @param {Buffer} params.buffer
 * @param {string} params.originalName
 * @param {'portraits'|'voices'|'documents'|'videos'} params.subfolder
 * @returns {Promise<{ filePath: string, publicUrl: string, sizeBytes: number, filename: string }>}
 */
async function saveFile({ buffer, originalName, subfolder = 'documents' }) {
  ensureDirectories();
  const ext = path.extname(originalName || '').toLowerCase() || '.bin';
  const hash = crypto.randomBytes(12).toString('hex');
  const filename = `${Date.now()}_${hash}${ext}`;
  const targetDir = path.join(UPLOADS_DIR, subfolder);
  const targetPath = path.join(targetDir, filename);

  await fs.promises.writeFile(targetPath, buffer);
  const publicUrl = `/uploads/${subfolder}/${filename}`;

  return {
    filePath: targetPath,
    publicUrl,
    sizeBytes: buffer.length,
    filename,
    subfolder,
  };
}

/**
 * Deletes a file from storage if it exists
 * @param {string} publicUrlOrPath
 */
async function deleteFile(publicUrlOrPath) {
  if (!publicUrlOrPath) return false;
  try {
    let targetPath = publicUrlOrPath;
    if (publicUrlOrPath.startsWith('/uploads/')) {
      const rel = publicUrlOrPath.replace(/^\/uploads\//, '');
      targetPath = path.join(UPLOADS_DIR, rel);
    }
    if (fs.existsSync(targetPath)) {
      await fs.promises.unlink(targetPath);
      return true;
    }
  } catch (err) {
    console.warn(`[Storage Warning] Failed to delete file ${publicUrlOrPath}:`, err.message);
  }
  return false;
}

module.exports = {
  ensureDirectories,
  saveFile,
  deleteFile,
  UPLOADS_DIR,
};
