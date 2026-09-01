require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api', apiRoutes);

app.get('/', (req, res) => {
    res.send('CIRO Backend is running. Use /api/crisis/analyze to start.');
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('New client connected to logs stream');
    
    // Simulate live logs streaming
    const interval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            const logs = [
                { agentId: 1, level: 'INFO', message: 'Scanning sector G-10 for anomalies...', timestamp: new Date().toLocaleTimeString() },
                { agentId: 2, level: 'DETECT', message: 'Potential signal match found in sector F-7', timestamp: new Date().toLocaleTimeString() },
            ];
            ws.send(JSON.stringify(logs[Math.floor(Math.random() * logs.length)]));
        }
    }, 5000);

    ws.on('close', () => {
        clearInterval(interval);
        console.log('Client disconnected');
    });
});

// Global WSS for use in routes if needed
global.wss = wss;

server.listen(PORT, () => {
    console.log(`CIRO Backend Server running on port ${PORT}`);
});
