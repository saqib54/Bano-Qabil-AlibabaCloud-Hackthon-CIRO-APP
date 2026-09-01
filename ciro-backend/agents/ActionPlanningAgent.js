const { planActions } = require('../services/geminiService');
const fs = require('fs');
const path = require('path');

class ActionPlanningAgent {
    constructor() {
        this.mockProvidersPath = path.resolve(__dirname, '../mock-data/providers.json');
    }

    async plan(crisis) {
        console.log(`AGENT_3 [ActionPlanning]: Planning response for ${crisis.crisis_type} at ${crisis.affected_area}...`);
        
        const rawData = fs.readFileSync(this.mockProvidersPath, 'utf8');
        const resources = JSON.parse(rawData);

        const actionPlan = await planActions(crisis, resources);
        
        if (actionPlan && actionPlan.actions) {
            console.log(`AGENT_3 [ActionPlanning]: Planned ${actionPlan.actions.length} actions.`);
            return actionPlan;
        } else {
            console.log("AGENT_3 [ActionPlanning]: Failed to generate action plan.");
            return null;
        }
    }
}

module.exports = new ActionPlanningAgent();
