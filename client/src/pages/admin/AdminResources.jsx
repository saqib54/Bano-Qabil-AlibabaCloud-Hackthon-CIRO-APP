import { useCallback, useEffect, useState } from 'react';
import { Boxes, Users, Shield, Building, AlertTriangle } from 'lucide-react';
import { adminApi } from '../../api/admin.api';
import { getErrorMessage } from '../../api/client';

export default function AdminResources() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.resources()
      .then((res) => setData(res))
      .catch((err) => console.error(getErrorMessage(err, 'Failed to load resources')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="card p-8 text-center text-sm text-ink-soft">Loading resources…</div>;
  if (!data) return <div className="card p-8 text-center text-sm text-ink-soft">No data available</div>;

  const depts = data.departments || [];
  const totalStaff = depts.reduce((s, d) => s + d.total_staff, 0);
  const totalOnDuty = depts.reduce((s, d) => s + d.on_duty, 0);
  const totalDeployed = depts.reduce((s, d) => s + d.deployed, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Boxes className="h-6 w-6 text-brand" /> Resource Management
          </h1>
          <p className="mt-1 text-sm text-ink-soft">Department staffing, allocation, and shelter capacity overview</p>
        </div>
        <button onClick={load} className="btn-secondary text-xs px-3 py-1.5">Refresh</button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-brand">{depts.length}</p>
          <p className="text-[10px] text-ink-soft mt-1">Departments</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-ink">{totalStaff}</p>
          <p className="text-[10px] text-ink-soft mt-1">Total Staff</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-safe">{totalOnDuty}</p>
          <p className="text-[10px] text-ink-soft mt-1">On Duty</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{totalDeployed}</p>
          <p className="text-[10px] text-ink-soft mt-1">Deployed</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-safe">{data.shelters?.active || 0}</p>
          <p className="text-[10px] text-ink-soft mt-1">Active Shelters</p>
        </div>
      </div>

      {/* Department resource table */}
      <div className="card">
        <h2 className="px-6 pt-5 pb-3 text-sm font-bold flex items-center gap-2">
          <Building className="h-4 w-4 text-brand" /> Department Allocation
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface border-b border-line">
                <th className="px-5 py-2.5 text-left font-semibold">Department</th>
                <th className="px-5 py-2.5 text-center font-semibold">Code</th>
                <th className="px-5 py-2.5 text-center font-semibold">Total Staff</th>
                <th className="px-5 py-2.5 text-center font-semibold">On Duty</th>
                <th className="px-5 py-2.5 text-center font-semibold">Deployed</th>
                <th className="px-5 py-2.5 text-center font-semibold">Active Incidents</th>
                <th className="px-5 py-2.5 text-center font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {depts.map((d) => {
                const utilization = d.total_staff > 0
                  ? Math.round(((d.on_duty + d.deployed) / d.total_staff) * 100)
                  : 0;
                const overloaded = d.active_incidents > d.on_duty;
                return (
                  <tr key={d.id} className="border-t border-line hover:bg-surface/50">
                    <td className="px-5 py-2.5 font-medium">{d.name}</td>
                    <td className="px-5 py-2.5 text-center text-ink-soft">{d.code}</td>
                    <td className="px-5 py-2.5 text-center">{d.total_staff}</td>
                    <td className="px-5 py-2.5 text-center">
                      <span className="text-safe font-medium">{d.on_duty}</span>
                    </td>
                    <td className="px-5 py-2.5 text-center">
                      <span className="text-purple-600 font-medium">{d.deployed}</span>
                    </td>
                    <td className="px-5 py-2.5 text-center">
                      <span className={`font-bold ${overloaded ? 'text-danger' : 'text-ink'}`}>{d.active_incidents}</span>
                    </td>
                    <td className="px-5 py-2.5 text-center">
                      {overloaded ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 text-danger px-2 py-0.5 text-[10px] font-bold">
                          <AlertTriangle className="h-3 w-3" /> Overloaded
                        </span>
                      ) : utilization > 70 ? (
                        <span className="inline-flex rounded-full bg-warn/10 text-warn px-2 py-0.5 text-[10px] font-bold">
                          {utilization}% utilized
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-safe/10 text-safe px-2 py-0.5 text-[10px] font-bold">
                          Available
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shelter capacity */}
      <div className="card p-6">
        <h2 className="text-sm font-bold flex items-center gap-2 mb-4">
          <Shield className="h-4 w-4 text-safe" /> Shelter Capacity
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-line p-4 text-center">
            <p className="text-xl font-bold text-ink">{data.shelters?.total || 0}</p>
            <p className="text-[10px] text-ink-soft mt-1">Total Shelters</p>
          </div>
          <div className="rounded-xl border border-line p-4 text-center">
            <p className="text-xl font-bold text-safe">{data.shelters?.active || 0}</p>
            <p className="text-[10px] text-ink-soft mt-1">Active</p>
          </div>
          <div className="rounded-xl border border-line p-4 text-center">
            <p className="text-xl font-bold text-brand">{data.shelters?.totalCapacity || 0}</p>
            <p className="text-[10px] text-ink-soft mt-1">Total Capacity</p>
          </div>
        </div>
      </div>
    </div>
  );
}
