CREATE TABLE IF NOT EXISTS crisis_events (id TEXT PRIMARY KEY, type TEXT, severity TEXT, confidence INTEGER, lat REAL, lng REAL, area TEXT, summary TEXT, status TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS signals (id TEXT PRIMARY KEY, text TEXT, source TEXT, location TEXT, lat REAL, lng REAL, crisis_id TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS actions (id TEXT PRIMARY KEY, crisis_id TEXT, type TEXT, description TEXT, priority INTEGER, status TEXT, executed_at DATETIME);
CREATE TABLE IF NOT EXISTS execution_logs (id TEXT PRIMARY KEY, action_id TEXT, agent_name TEXT, message TEXT, level TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS resources (id TEXT PRIMARY KEY, name TEXT, type TEXT, status TEXT, lat REAL, lng REAL, last_updated DATETIME DEFAULT CURRENT_TIMESTAMP);
