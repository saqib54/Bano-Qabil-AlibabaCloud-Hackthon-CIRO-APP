const fs = require('fs');
const path = require('path');

class SignalIngestionAgent {
    constructor() {
        this.mockDataPath = path.resolve(__dirname, '../mock-data/signals.json');
    }

    detectLanguage(text) {
        text = text.toLowerCase();
        const urduKeywords = ['pani', 'phans', 'bijli', 'khamba', 'khatarnak', 'gaya', 'hai', 'bohot', 'mein', 'ke'];
        const englishKeywords = ['flood', 'traffic', 'blocked', 'smoke', 'fire', 'heavy', 'warning'];

        let urduScore = 0;
        let englishScore = 0;

        urduKeywords.forEach(kw => { if (text.includes(kw)) urduScore++; });
        englishKeywords.forEach(kw => { if (text.includes(kw)) englishScore++; });

        if (urduScore > englishScore) return 'urdu/roman_urdu';
        return 'english';
    }

    ingestMockSignals() {
        console.log("AGENT_1 [SignalIngestion]: Processing mock signals...");
        const rawData = fs.readFileSync(this.mockDataPath, 'utf8');
        const data = JSON.parse(rawData);
        
        let allSignals = [
            ...data.social_posts,
            ...data.weather_alerts,
            ...data.traffic_reports
        ];

        return allSignals.map(sig => this.processSignal(sig));
    }

    processSignal(signal) {
        let textToAnalyze = signal.text || signal.message || "";
        let lang = this.detectLanguage(textToAnalyze);
        
        // Basic tagging
        let type = 'unknown';
        let severityScore = 0;

        if (textToAnalyze.includes('pani') || textToAnalyze.includes('flood') || textToAnalyze.includes('rain')) {
            type = 'flooding';
            severityScore = 7;
        } else if (textToAnalyze.includes('bijli') || textToAnalyze.includes('power')) {
            type = 'power_outage';
            severityScore = 5;
        } else if (textToAnalyze.includes('smoke') || textToAnalyze.includes('fire')) {
            type = 'fire';
            severityScore = 8;
        } else if (textToAnalyze.includes('traffic') || textToAnalyze.includes('blocked')) {
            type = 'road_blockage';
            severityScore = 6;
        }

        if (signal.severity === 'CRITICAL' || signal.congestion_level === 'CRITICAL') severityScore = 9;
        if (signal.severity === 'HIGH' || signal.congestion_level === 'HIGH') severityScore = 7;

        return {
            ...signal,
            language: lang,
            crisis_type_tag: type,
            severity_score: severityScore,
            processed_at: new Date().toISOString()
        };
    }

    ingestCustomSignal(customText, locationInfo = {}) {
        console.log("AGENT_1 [SignalIngestion]: Processing custom signal...");
        let newSignal = {
            id: 'custom_' + Date.now(),
            text: customText,
            timestamp: new Date().toISOString(),
            source: 'custom_input',
            ...locationInfo
        };
        return [this.processSignal(newSignal)];
    }
}

module.exports = new SignalIngestionAgent();
