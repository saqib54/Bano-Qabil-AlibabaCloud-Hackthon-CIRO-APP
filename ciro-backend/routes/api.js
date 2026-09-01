const express = require('express');
const router = express.Router();
const db = require('../db');

const SignalIngestionAgent = require('../agents/SignalIngestionAgent');
const CrisisDetectionAgent = require('../agents/CrisisDetectionAgent');
const ActionPlanningAgent = require('../agents/ActionPlanningAgent');
const ExecutionSimulationAgent = require('../agents/ExecutionSimulationAgent');

// Full Analysis Pipeline
router.post('/crisis/analyze', async (req, res) => {
    try {
        let agentTraces = [];
        const logTrace = (agent, msg, level = 'INFO') => {
            const trace = { agentId: agent.replace('AGENT_', ''), level, message: msg, timestamp: new Date().toLocaleTimeString() };
            console.log(`[${agent}] ${msg}`);
            agentTraces.push(trace);
            
            // Stream to WebSockets if available
            if (global.wss) {
                global.wss.clients.forEach(client => {
                    if (client.readyState === 1) { // WebSocket.OPEN
                        client.send(JSON.stringify(trace));
                    }
                });
            }
        };

        logTrace('AGENT_1', 'Starting ingestion pipeline...', 'INFO');
        let signals = [];
        if (req.body.custom_text) {
            signals = SignalIngestionAgent.ingestCustomSignal(req.body.custom_text);
        } else if (req.body.signals && req.body.signals.length > 0) {
            signals = req.body.signals.map(s => SignalIngestionAgent.processSignal(s));
        } else {
            signals = SignalIngestionAgent.ingestMockSignals();
        }

        logTrace('AGENT_2', `Sending ${signals.length} signals for crisis detection...`, 'DETECT');
        const crisis = await CrisisDetectionAgent.detect(signals);
        
        if (!crisis || !crisis.crisis_detected) {
            logTrace('AGENT_2', 'No crisis detected. Terminating pipeline.', 'WARN');
            return res.json({ status: 'no_crisis', agent_traces: agentTraces });
        }

        const crisisId = `crisis_${Date.now()}`;
        db.run(`INSERT INTO crisis_events (id, type, severity, confidence, lat, lng, area, summary, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [crisisId, crisis.crisis_type, crisis.severity, crisis.confidence, crisis.lat, crisis.lng, crisis.affected_area, crisis.summary, 'ACTIVE']
        );

        logTrace('AGENT_3', 'Planning actions based on detected crisis...', 'ACTION');
        const plan = await ActionPlanningAgent.plan(crisis);

        let executionLogs = [];
        if (plan && plan.actions) {
            logTrace('AGENT_4', 'Simulating execution of action plan...', 'SUCCESS');
            executionLogs = await ExecutionSimulationAgent.simulate(plan, crisisId);
            
            // Store logs in DB
            executionLogs.forEach(log => {
                db.run(`INSERT INTO execution_logs (id, action_id, agent_name, message, level) VALUES (?, ?, ?, ?, ?)`,
                    [`log_${Date.now()}_${Math.random()}`, log.action_id, log.agent, log.message, log.status]
                );
            });
        }

        res.json({
            status: 'success',
            crisis: { id: crisisId, ...crisis },
            actions: plan ? plan.actions : [],
            execution_logs: executionLogs,
            agent_traces: agentTraces
        });

    } catch (error) {
        console.error("API Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// New Endpoint: Dashboard Stats
router.get('/crisis/stats', (req, res) => {
    const stats = {
        activeCrises: 0,
        signalsToday: 42,
        actionsDone: 128,
        avgResponseTime: '12m'
    };
    
    db.get("SELECT COUNT(*) as count FROM crisis_events WHERE status = 'ACTIVE'", (err, row) => {
        if (!err && row) stats.activeCrises = row.count;
        res.json(stats);
    });
});

// New Endpoint: Scenarios
router.get('/scenarios/:name', (req, res) => {
    const scenarios = {
        'flood_g10': {
            text: "Massive flooding reported in sector G-10 after heavy rain. Multiple residents stranded.",
            type: "Flood",
            location: "G-10"
        },
        'power_f7': {
            text: "Main power grid failure in F-7. Hospitals running on backup. Traffic lights down.",
            type: "Power Outage",
            location: "F-7"
        },
        'accident_murree': {
            text: "Multi-vehicle pileup on Murree Road. Multiple injuries. Route blocked.",
            type: "Accident",
            location: "Murree Road"
        }
    };
    
    const scenario = scenarios[req.params.name];
    if (scenario) res.json(scenario);
    else res.status(404).json({ error: "Scenario not found" });
});

// Get initial signals for the dashboard
router.get('/crisis/signals', (req, res) => {
    try {
        const signals = SignalIngestionAgent.ingestMockSignals();
        res.json(signals);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// New Endpoint: Signal Stream (SSE)
router.get('/signals/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendSignal = () => {
        const signal = SignalIngestionAgent.ingestMockSignals()[0];
        res.write(`data: ${JSON.stringify(signal)}\n\n`);
    };

    const interval = setInterval(sendSignal, 10000);
    
    req.on('close', () => {
        clearInterval(interval);
        res.end();
    });
});

router.get('/signals/mock', (req, res) => {
    const signals = SignalIngestionAgent.ingestMockSignals();
    res.json(signals);
});

router.get('/crisis/history', (req, res) => {
    db.all("SELECT * FROM crisis_events ORDER BY created_at DESC", (err, rows) => {
        if (err) res.status(500).json({ error: err.message });
        else res.json(rows);
    });
});

router.get('/execution/logs', (req, res) => {
    db.all("SELECT * FROM execution_logs ORDER BY timestamp DESC", (err, rows) => {
        if (err) res.status(500).json({ error: err.message });
        else res.json(rows);
    });
});

module.exports = router;
