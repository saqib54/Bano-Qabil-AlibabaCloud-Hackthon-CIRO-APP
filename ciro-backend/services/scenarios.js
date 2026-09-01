const axios = require('axios');

const SCENARIO_1 = {
    name: "Urban Flooding - G10 Islamabad",
    signals: [
        {"id": "s1_1", "text": "G-10 mein pani bhar gaya hai, gaariyan phans gayi hain", "source": "twitter", "lat": 33.6938, "lng": 72.9862},
        {"id": "s1_2", "text": "Water level rising near G-10 Markaz, shops getting flooded", "source": "facebook", "lat": 33.6940, "lng": 72.9860},
        {"id": "s1_3", "text": "Heavy rainfall expected next 3 hours, 45mm precipitation in Islamabad", "source": "weather_alert", "severity": "HIGH"}
    ]
};

const SCENARIO_2 = {
    name: "Power Outage - F7 Sector",
    signals: [
        {"id": "s2_1", "text": "Bijli ka khamba gir gaya F-7 markaz ke paas, bohot khatarnak", "source": "twitter", "lat": 33.7215, "lng": 73.0571},
        {"id": "s2_2", "text": "Power outage in whole F-7 sector since 2 hours", "source": "resident_app", "lat": 33.7210, "lng": 73.0570}
    ]
};

const SCENARIO_3 = {
    name: "Road Accident - Murree Road",
    signals: [
        {"id": "s3_1", "text": "Huge accident on Murree Road, traffic completely blocked", "source": "facebook", "lat": 33.6550, "lng": 73.0769},
        {"id": "s3_2", "location": "Murree Road", "congestion_level": "CRITICAL", "affected_routes": ["GT Road"], "source": "traffic_cam"}
    ]
};

module.exports = {
    SCENARIO_1,
    SCENARIO_2,
    SCENARIO_3
};
