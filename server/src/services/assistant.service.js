/**
 * AI Emergency Assistant service — Sprint 9
 * Conversational AI that helps citizens with emergency guidance.
 */
const db = require('../../database/connection');
const env = require('../config/env');

const ASSISTANT_SYSTEM_PROMPT = `You are CIRO AI, an emergency response assistant for the city of Sialkot, Pakistan.
You help citizens with:
- Emergency guidance (what to do during floods, fires, accidents, etc.)
- Safety tips and first aid advice
- Reporting emergencies (guide them to use the Report Emergency page)
- Status updates on their reports
- Finding nearby shelters and safe places

IMPORTANT RULES:
- Be concise and actionable. Use short sentences.
- For life-threatening emergencies, ALWAYS tell them to call 1122 immediately.
- Never provide medical diagnosis — only first aid guidance.
- If asked about incident status, tell them to check "My Reports" page.
- Keep responses under 200 words unless the user needs detailed guidance.
- Use simple English that non-native speakers can understand.
- Format with bullet points for step-by-step instructions.

Emergency numbers in Pakistan:
- Rescue: 1122
- Police: 15
- Fire: 16
- Edhi Ambulance: 115`;

/**
 * Chat with the AI assistant.
 * @param {string} userMessage - The user's message
 * @param {Array} conversationHistory - Previous messages [{role, content}]
 * @returns {Promise<string>} AI response text
 */
async function chat(userMessage, conversationHistory = []) {
  const { apiKey, baseUrl, textModel } = env.dashscope;

  if (!apiKey) {
    return buildFallbackResponse(userMessage);
  }

  const messages = [
    { role: 'system', content: ASSISTANT_SYSTEM_PROMPT },
    ...conversationHistory.slice(-6),
    { role: 'user', content: userMessage }
  ];

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: textModel,
        messages,
        temperature: 0.5,
        max_tokens: 400
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      return buildFallbackResponse(userMessage);
    }

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content;
    return content || buildFallbackResponse(userMessage);
  } catch (err) {
    console.error('[ai-assistant] Chat failed:', err.message);
    return buildFallbackResponse(userMessage);
  }
}

/**
 * Rule-based fallback when AI is unavailable.
 */
function buildFallbackResponse(userMessage) {
  const msg = (userMessage || '').toLowerCase();

  if (msg.includes('fire')) {
    return `**Fire Emergency Steps:**\n- Call **1122** immediately\n- Evacuate the building — do not use elevators\n- Stay low to avoid smoke inhalation\n- Move to a safe distance from the building\n- Do not re-enter until firefighters say it is safe`;
  }
  if (msg.includes('flood') || msg.includes('water')) {
    return `**Flood Safety Steps:**\n- Call **1122** for rescue\n- Move to higher ground immediately\n- Do not walk or drive through floodwater\n- Turn off electricity at main switch if safe\n- Keep important documents in waterproof bags`;
  }
  if (msg.includes('accident') || msg.includes('crash')) {
    return `**Road Accident Steps:**\n- Call **1122** for ambulance and rescue\n- Do not move injured persons unless in immediate danger\n- Set up warning triangles or signals for other drivers\n- Take photos for insurance if possible\n- Wait for rescue teams to arrive`;
  }
  if (msg.includes('medical') || msg.includes('injur') || msg.includes('hurt')) {
    return `**Medical Emergency Steps:**\n- Call **1122** for ambulance\n- Keep the person still and calm\n- If bleeding, apply pressure with clean cloth\n- Do not give food or water to unconscious person\n- Stay on the line with emergency services`;
  }
  if (msg.includes('shelter') || msg.includes('safe')) {
    return `Check the **Safe Places** page in the CIRO app to find nearby shelters, hospitals, and evacuation points. You can also call **1122** for guidance on the nearest safe location.`;
  }
  if (msg.includes('report') || msg.includes('status')) {
    return `To check your report status, go to **My Reports** in the menu. Each report shows its current status from "Reported" to "Resolved". For urgent updates, call **1122**.`;
  }

  return `I'm the CIRO AI emergency assistant. I can help you with:\n\n- **Emergency guidance** — what to do during fires, floods, accidents\n- **First aid tips** — basic medical response steps\n- **Finding shelters** — nearby safe places\n- **Report status** — how to check your emergency reports\n\n**For any life-threatening emergency, call 1122 immediately.**\n\nWhat do you need help with?`;
}

module.exports = { chat };
