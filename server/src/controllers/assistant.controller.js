/**
 * AI Emergency Assistant controller — Sprint 9
 */
const assistantService = require('../services/assistant.service');
const asyncHandler = require('../utils/asyncHandler');

/** POST /api/v1/assistant/chat */
async function chat(req, res) {
  const { message, history } = req.body;
  if (!message || message.trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Message is required' });
  }
  const reply = await assistantService.chat(message, history || []);
  res.json({ success: true, message: 'AI response', data: { reply } });
}

module.exports = {
  chat: asyncHandler(chat)
};
