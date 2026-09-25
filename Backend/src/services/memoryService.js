/**
 * memoryService.js - Persistent Memory Abstraction & Sync
 * Manages long-term memories in MongoDB and coordinates RAG retrieval with CloneLLM.
 */
const Memory = require('../models/Memory');
const Kin = require('../models/Kin');
const cloneLlmService = require('./cloneLlmService');

/**
 * Retrieves all long-term memories for a specified KIN
 */
async function getMemoriesForKin(kinId) {
  return await Memory.find({ kinId }).sort({ createdAt: -1 });
}

/**
 * Creates and persists a new memory item
 */
async function addMemory({
  kinId,
  userId,
  category = 'written_note',
  title = 'Memory',
  content,
  sourceFileUrl = null,
  sourceFileName = null,
  metadata = {},
}) {
  if (!content || !content.trim()) {
    throw new Error('Memory content cannot be empty.');
  }

  const memory = await Memory.create({
    kinId,
    userId,
    category,
    title: title.trim(),
    content: content.trim(),
    sourceFileUrl,
    sourceFileName,
    metadata,
  });

  // Re-sync memories to CloneLLM engine
  await syncKinMemoriesToCloneEngine(kinId).catch((err) => {
    console.warn(`[MemoryService] Notice: could not immediately sync memory to CloneLLM: ${err.message}`);
  });

  return memory;
}

/**
 * Syncs a KIN and all its persistent MongoDB memories into the CloneLLM RAG retriever
 */
async function syncKinMemoriesToCloneEngine(kinId) {
  const kin = await Kin.findById(kinId);
  if (!kin) return null;

  const memories = await Memory.find({ kinId }).sort({ createdAt: 1 });
  const memoryTexts = memories.map((m) => {
    const prefix = m.title && m.title !== 'Memory' ? `[${m.title}] ` : '';
    return `${prefix}${m.content}`;
  });

  const syncPayload = {
    slug: kin.slug,
    name: kin.name,
    callingName: kin.callingName || kin.name,
    relation: kin.relation,
    lifespan: kin.lifespan,
    hometown: kin.hometown,
    personalitySummary: kin.personalitySummary,
    catchphrases: kin.catchphrases,
    memories: memoryTexts,
  };

  return await cloneLlmService.syncPersona(syncPayload);
}

/**
 * Deletes all memories associated with a KIN
 */
async function deleteMemoriesForKin(kinId) {
  return await Memory.deleteMany({ kinId });
}

module.exports = {
  getMemoriesForKin,
  addMemory,
  syncKinMemoriesToCloneEngine,
  deleteMemoriesForKin,
};
