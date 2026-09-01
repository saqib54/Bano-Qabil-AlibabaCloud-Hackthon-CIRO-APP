const db = require('../../database/connection');

const analyticsService = {
  getOperationalAnalytics() {
    // Category distribution
    const categories = db.prepare(`
      SELECT category, COUNT(*) AS count
      FROM incidents GROUP BY category ORDER BY count DESC
    `).all();

    // Status distribution
    const statuses = db.prepare(`
      SELECT status, COUNT(*) AS count
      FROM incidents GROUP BY status ORDER BY count DESC
    `).all();

    // Severity distribution
    const severities = db.prepare(`
      SELECT COALESCE(verified_severity, ai_recommended_severity, 'MEDIUM') AS severity, COUNT(*) AS count
      FROM incidents GROUP BY severity ORDER BY count DESC
    `).all();

    // Daily incident trend (last 14 days)
    const trend = db.prepare(`
      SELECT DATE(created_at) AS date, COUNT(*) AS count
      FROM incidents
      WHERE created_at >= datetime('now', '-14 days')
      GROUP BY DATE(created_at)
      ORDER BY date
    `).all();

    // Average resolution time (hours) for resolved incidents
    const resolutionStats = db.prepare(`
      SELECT
        COUNT(*) AS resolved_count,
        AVG(
          (julianday(updated_at) - julianday(created_at)) * 24
        ) AS avg_hours
      FROM incidents
      WHERE status = 'RESOLVED'
    `).get();

    // Department workload
    const deptWorkload = db.prepare(`
      SELECT d.name, d.code,
        COUNT(DISTINCT i.id) AS total_incidents,
        SUM(CASE WHEN i.status NOT IN ('RESOLVED','REJECTED','DUPLICATE','CANCELLED') THEN 1 ELSE 0 END) AS active
      FROM departments d
      LEFT JOIN incidents i ON i.assigned_department_id = d.id
      GROUP BY d.id
      ORDER BY active DESC
    `).all();

    // Response metrics
    const totalIncidents = db.prepare('SELECT COUNT(*) AS c FROM incidents').get().c;
    const resolvedCount = db.prepare("SELECT COUNT(*) AS c FROM incidents WHERE status = 'RESOLVED'").get().c;
    const avgResponseTime = resolutionStats?.avg_hours || 0;

    return {
      categories, statuses, severities, trend,
      resolution: {
        resolvedCount: resolutionStats?.resolved_count || 0,
        avgHours: Math.round((avgResponseTime || 0) * 10) / 10
      },
      departmentWorkload: deptWorkload,
      summary: {
        totalIncidents,
        resolvedCount,
        resolutionRate: totalIncidents > 0 ? Math.round((resolvedCount / totalIncidents) * 100) : 0
      }
    };
  },

  getResourceOverview() {
    // Department staff + incident allocation
    const departments = db.prepare(`
      SELECT d.id, d.name, d.code, d.contact, d.is_active,
        (SELECT COUNT(*) FROM staff_profiles sp WHERE sp.department_id = d.id) AS total_staff,
        (SELECT COUNT(*) FROM staff_profiles sp WHERE sp.department_id = d.id AND sp.duty_status = 'ON_DUTY') AS on_duty,
        (SELECT COUNT(*) FROM staff_profiles sp WHERE sp.department_id = d.id AND sp.duty_status = 'DEPLOYED') AS deployed,
        (SELECT COUNT(*) FROM incidents i WHERE i.assigned_department_id = d.id AND i.status NOT IN ('RESOLVED','REJECTED','DUPLICATE','CANCELLED')) AS active_incidents
      FROM departments d
      ORDER BY d.name
    `).all();

    // Shelter capacity
    const shelterStats = db.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active,
        SUM(capacity) AS total_capacity
      FROM shelters
    `).get();

    return {
      departments,
      shelters: {
        total: shelterStats?.total || 0,
        active: shelterStats?.active || 0,
        totalCapacity: shelterStats?.total_capacity || 0
      }
    };
  },

  getWeatherData() {
    // Mock weather intelligence for Sialkot (demo data)
    const now = new Date();
    const forecasts = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const conditions = ['Clear', 'Partly Cloudy', 'Overcast', 'Light Rain', 'Thunderstorm'];
      const temps = [34, 32, 30, 28, 26];
      const humidity = [45, 55, 65, 78, 88];
      forecasts.push({
        date: d.toISOString().slice(0, 10),
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
        condition: conditions[i],
        tempHigh: temps[i] + Math.round(Math.random() * 3),
        tempLow: temps[i] - 8 + Math.round(Math.random() * 2),
        humidity: humidity[i] + Math.round(Math.random() * 5 - 2),
        windKph: 8 + Math.round(Math.random() * 20),
        risk: i >= 3 ? (i === 4 ? 'HIGH' : 'MEDIUM') : 'LOW'
      });
    }

    return {
      city: 'Sialkot',
      region: 'Punjab, Pakistan',
      current: {
        condition: 'Partly Cloudy',
        temperature: 33,
        humidity: 52,
        windKph: 12,
        aqi: 142,
        aqiLabel: 'Unhealthy for Sensitive Groups',
        uvIndex: 7
      },
      forecast: forecasts,
      alerts: [
        { level: 'ADVISORY', title: 'Heat Advisory', message: 'Temperatures expected to exceed 38°C this week. Ensure hydration for field responders.' },
        { level: 'WATCH', title: 'Monsoon Watch', message: 'Heavy rainfall expected Thursday-Friday. Flood risk elevated in low-lying areas.' }
      ],
      updatedAt: now.toISOString()
    };
  }
};

module.exports = analyticsService;
