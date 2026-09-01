const { analyzeCrisis } = require('../services/geminiService');

class CrisisDetectionAgent {
    async detect(signals) {
        console.log("AGENT_2 [CrisisDetection]: Analyzing " + signals.length + " signals...");
        console.log("AGENT_2 [CrisisDetection]: Sending to Gemini for analysis...");
        
        const crisisObject = await analyzeCrisis(signals);
        
        if (crisisObject && crisisObject.crisis_detected) {
            console.log(`AGENT_2 [CrisisDetection]: Crisis detected (confidence: ${crisisObject.confidence}%)`);
            return crisisObject;
        } else {
            console.log("AGENT_2 [CrisisDetection]: No significant crisis detected.");
            return null;
        }
    }
}

module.exports = new CrisisDetectionAgent();
