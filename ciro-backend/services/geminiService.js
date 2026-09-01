const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-001",
    generationConfig: { responseMimeType: "application/json" }
});

// Helper to create a realistic mock response based on input
function getDynamicMock(signals) {
    const text = JSON.stringify(signals).toLowerCase();
    let type = "flooding";
    let area = "G-10, Islamabad";
    let lat = 33.6938, lng = 72.9862;

    if (text.includes("fire") || text.includes("aag")) {
        type = "fire";
        area = "I-9 Industrial Area, Islamabad";
        lat = 33.6403; lng = 73.0645;
    } else if (text.includes("accident") || text.includes("hadsa")) {
        type = "accident";
        area = "Murree Road, Rawalpindi";
        lat = 33.6015; lng = 73.0664;
    } else if (text.includes("outage") || text.includes("bijli")) {
        type = "power_outage";
        area = "F-7 Markaz, Islamabad";
        lat = 33.7128; lng = 73.0551;
    }

    return {
        crisis_detected: true,
        crisis_type: type,
        severity: "HIGH",
        confidence: 90,
        affected_area: area,
        lat: lat,
        lng: lng,
        summary: `Detected ${type} emergency based on user report. Situation is being monitored.`,
        key_signals_used: ["custom_report"]
    };
}

async function analyzeCrisis(signals) {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('your_key_here')) {
        return getDynamicMock(signals);
    }
    try {
        const prompt = `You are an expert crisis detection AI for Pakistani cities. Analyze these emergency signals carefully.
        SIGNALS: ${JSON.stringify(signals, null, 2)}
        Respond with a JSON object ONLY: { "crisis_detected": true, "crisis_type": "flooding|fire|accident|power_outage", "severity": "CRITICAL|HIGH|MEDIUM|LOW", "confidence": 94, "affected_area": "Area, City", "lat": 33.0, "lng": 73.0, "summary": "description", "key_signals_used": ["s1"] }`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        return JSON.parse(responseText);
    } catch (error) {
        console.error("Gemini API Error, using dynamic mock");
        return getDynamicMock(signals);
    }
}

async function planActions(crisis, resources) {
    const dynamicActions = [
        { id: "act_1", type: "dispatch_rescue", description: `Dispatch Rescue to ${crisis.affected_area}`, priority: 1, assigned_resource_id: "r1", estimated_impact: "Save lives in 10 mins", simulation_data: {} },
        { id: "act_2", type: "send_alert", description: `Alert residents of ${crisis.affected_area} via SMS`, priority: 2, assigned_resource_id: null, estimated_impact: "Thousands notified", simulation_data: {} }
    ];

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('your_key_here')) {
        return { actions: dynamicActions, reasoning: "Standard response for " + crisis.crisis_type, estimated_resolution_time: "1 hour" };
    }
    try {
        const prompt = `Generate emergency actions for: ${JSON.stringify(crisis)}. Resources: ${JSON.stringify(resources)}. Respond with JSON { "actions": [...], "reasoning": "...", "estimated_resolution_time": "..." }`;
        const result = await model.generateContent(prompt);
        return JSON.parse(result.response.text());
    } catch (error) {
        return { actions: dynamicActions, reasoning: "Fallback response protocol activated.", estimated_resolution_time: "1 hour" };
    }
}

module.exports = { analyzeCrisis, planActions };
