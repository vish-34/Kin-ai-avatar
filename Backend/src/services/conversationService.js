/**
 * conversationService.js - Conversation State & History Persistence
 */
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

/**
 * Gets or creates an active conversation session for a user and KIN
 */
async function getOrCreateConversation({ kinId, userId, mode = 'voice' }) {
  try {
    let conv = await Conversation.findOne({
      kinId,
      userId,
    }).sort({ lastActivityAt: -1 });

    if (!conv) {
      conv = await Conversation.create({
        kinId,
        userId,
        mode,
        startedAt: new Date(),
        lastActivityAt: new Date(),
      });
    } else {
      conv.lastActivityAt = new Date();
      conv.mode = mode;
      await conv.save();
    }
    return conv;
  } catch (err) {
    return null;
  }
}

/**
 * Records a completed dialogue turn in MongoDB
 */
async function recordTurn({ conversationId, kinId, userText, avatarText, citation, audioUrl, videoUrl }) {
  try {
    if (!conversationId || !kinId) return;

    // 1. Record User Message
    await Message.create({
      conversationId,
      kinId,
      sender: 'user',
      text: userText,
    });

    // 2. Record Avatar Message
    await Message.create({
      conversationId,
      kinId,
      sender: 'avatar',
      text: avatarText,
      citation,
      audioUrl,
      videoUrl,
    });

    // 3. Update Conversation Turn Count
    await Conversation.findByIdAndUpdate(conversationId, {
      $inc: { messageCount: 2 },
      lastActivityAt: new Date(),
    });
  } catch (err) {
    console.warn('[ConversationService Warning] Could not persist turn to DB:', err.message);
  }
}

module.exports = {
  getOrCreateConversation,
  recordTurn,
};
