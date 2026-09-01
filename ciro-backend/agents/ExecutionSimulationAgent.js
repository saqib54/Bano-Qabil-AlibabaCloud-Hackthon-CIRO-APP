const db = require('../db');

class ExecutionSimulationAgent {
    async simulate(actionPlan, crisisId) {
        console.log("AGENT_4 [ExecutionSimulation]: Starting simulation of actions...");
        let executionResults = [];

        for (const action of actionPlan.actions) {
            console.log(`AGENT_4 [ExecutionSimulation]: Executing action [${action.type}] - ${action.description}`);
            
            // Simulate realistic delay
            await new Promise(resolve => setTimeout(resolve, Math.random() * 1500 + 500));
            
            const success = Math.random() > 0.05; // 95% success rate
            
            let simulatedState = {
                before: {},
                after: {}
            };

            // Custom simulation logic per type
            if (action.type === 'reroute_traffic') {
                simulatedState.before = { status: "BLOCKED", vehicles_affected: Math.floor(Math.random() * 500) + 100 };
                simulatedState.after = { status: success ? "ACTIVE" : "BLOCKED", diversion_time: "3 mins", route: action.assigned_resource_id || "Alternate" };
            } else if (action.type === 'dispatch_rescue') {
                simulatedState.before = { status: "STANDBY", location: "Base" };
                simulatedState.after = { status: success ? "EN_ROUTE" : "DELAYED", eta: "8 mins", ticket_id: `EMG-2025-${Math.floor(Math.random() * 1000)}` };
            } else if (action.type === 'notify_hospital') {
                simulatedState.before = { beds_available: 45 };
                simulatedState.after = { beds_available: success ? 35 : 45, trauma_team: "ACTIVATED" };
            } else {
                simulatedState.before = { status: "PENDING" };
                simulatedState.after = { status: success ? "COMPLETED" : "FAILED" };
            }

            const result = {
                action_id: action.id,
                status: success ? 'COMPLETED' : 'FAILED',
                ...simulatedState,
                timestamp: new Date().toISOString()
            };

            executionResults.push(result);

            // Log to DB
            const uniqueActionId = `${crisisId}_${action.id || 'act'}_${Date.now()}`;
            db.run(`INSERT INTO actions (id, crisis_id, type, description, priority, status, executed_at) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
                [uniqueActionId, crisisId, action.type, action.description, action.priority, result.status, result.timestamp]
            );

            db.run(`INSERT INTO execution_logs (id, action_id, agent_name, message, level, timestamp) VALUES (?, ?, ?, ?, ?, ?)`,
                [`log_${Date.now()}_${Math.random()}`, uniqueActionId, 'AGENT_4', `Executed ${action.type}: ${result.status}`, result.status === 'COMPLETED' ? 'SUCCESS' : 'ERROR', result.timestamp]
            );
        }

        console.log("AGENT_4 [ExecutionSimulation]: Simulation completed.");
        return executionResults;
    }
}

module.exports = new ExecutionSimulationAgent();
