import { useCallback, useEffect, useState } from 'react';
import { BarChart3, TrendingUp, PieChart, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { adminApi } from '../../api/admin.api';
import { getErrorMessage } from '../../api/client';

const CATEGORY_COLORS = ['bg-brand', 'bg-danger', 'bg-warn', 'bg-safe', 'bg-purple-600', 'bg-teal-600', 'bg-pink-600', 'bg-orange-500'];
const SEVERITY_COLORS = { CRITICAL: 'bg-danger', HIGH: 'bg-warn', MEDIUM: 'bg-brand', LOW: 'bg-ink-soft' };

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.analytics()
      .then((res) => setData(res))
      .catch((err) => console.error(getErrorMessage(err, 'Failed to load analytics')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="card p-8 text-center text-sm text-ink-soft">Loading analytics…</div>;
  if (!data) return <div className="card p-8 text-center text-sm text-ink-soft">No data available</div>;

  const maxTrend = Math.max(...(data.trend || []).map((t) => t.count), 1);
  const maxCat = Math.max(...(data.categories || []).map((c) => c.count), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-brand" /> Operational Analytics
          </h1>
          <p className="mt-1 text-sm text-ink-soft">Incident trends, performance metrics, and department workload</p>
        </div>
        <button onClick={load} className="btn-secondary text-xs px-3 py-1.5">Refresh</button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-brand">{data.summary?.totalIncidents || 0}</p>
          <p className="text-[10px] text-ink-soft mt-1">Total Incidents</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-safe">{data.summary?.resolvedCount || 0}</p>
          <p className="text-[10px] text-ink-soft mt-1">Resolved</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-warn">{data.summary?.resolutionRate || 0}%</p>
          <p className="text-[10px] text-ink-soft mt-1">Resolution Rate</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-ink">{data.resolution?.avgHours || 0}h</p>
          <p className="text-[10px] text-ink-soft mt-1">Avg Resolution Time</p>
        </div>
      </div>

      {/* Incident trend chart (bar) */}
      <div className="card p-6">
        <h2 className="text-sm font-bold flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-brand" /> Daily Incident Trend (14 days)
        </h2>
        <div className="flex items-end gap-1.5 h-32">
          {(data.trend || []).map((t) => (
            <div key={t.date} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-brand/70 min-h-[2px] transition-all"
                style={{ height: `${(t.count / maxTrend) * 100}%` }}
                title={`${t.date}: ${t.count} incidents`}
              />
              <span className="text-[8px] text-ink-soft">{t.date.slice(8)}</span>
            </div>
          ))}
        </div>
        {(!data.trend || data.trend.length === 0) && (
          <p className="text-xs text-ink-soft text-center py-8">No trend data available</p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Category distribution */}
        <div className="card p-6">
          <h2 className="text-sm font-bold flex items-center gap-2 mb-4">
            <PieChart className="h-4 w-4 text-brand" /> By Category
          </h2>
          <div className="space-y-2">
            {(data.categories || []).map((c, i) => (
              <div key={c.category} className="flex items-center gap-3">
                <span className="w-24 text-xs text-ink-soft truncate">{c.category}</span>
                <div className="flex-1 h-5 bg-surface rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}`}
                    style={{ width: `${(c.count / maxCat) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-bold w-6 text-right">{c.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Severity distribution */}
        <div className="card p-6">
          <h2 className="text-sm font-bold flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-warn" /> By Severity
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {(data.severities || []).map((s) => (
              <div key={s.severity} className="rounded-xl border border-line p-3 text-center">
                <p className={`text-2xl font-bold ${
                  s.severity === 'CRITICAL' ? 'text-danger' :
                  s.severity === 'HIGH' ? 'text-warn' :
                  s.severity === 'MEDIUM' ? 'text-brand' : 'text-ink-soft'
                }`}>{s.count}</p>
                <p className="text-[10px] font-semibold text-ink-soft mt-1">{s.severity}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Department workload table */}
      <div className="card">
        <h2 className="px-6 pt-5 pb-3 text-sm font-bold">Department Workload</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface border-b border-line">
                <th className="px-5 py-2.5 text-left font-semibold">Department</th>
                <th className="px-5 py-2.5 text-center font-semibold">Code</th>
                <th className="px-5 py-2.5 text-center font-semibold">Total</th>
                <th className="px-5 py-2.5 text-center font-semibold">Active</th>
              </tr>
            </thead>
            <tbody>
              {(data.departmentWorkload || []).map((d) => (
                <tr key={d.code} className="border-t border-line hover:bg-surface/50">
                  <td className="px-5 py-2.5 font-medium">{d.name}</td>
                  <td className="px-5 py-2.5 text-center text-ink-soft">{d.code}</td>
                  <td className="px-5 py-2.5 text-center">{d.total_incidents}</td>
                  <td className="px-5 py-2.5 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      d.active > 3 ? 'bg-danger/10 text-danger' : d.active > 0 ? 'bg-warn/10 text-warn' : 'bg-safe/10 text-safe'
                    }`}>{d.active}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
