import React, { useState } from 'react';
import {
  History,
  Search,
  Filter,
  User,
  Clock,
  Layers,
  FileText,
  CreditCard,
  Settings,
  Shield,
  RefreshCw,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { formatDateTime } from '../../utils/formatters';

export const ActivityLogsView: React.FC = () => {
  const { activityLogs } = useData();
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Extract unique modules
  const modules: string[] = Array.from(new Set(activityLogs.map((l) => l.module)));

  const filteredLogs = activityLogs.filter((log) => {
    if (selectedModule !== 'all' && log.module !== selectedModule) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchAction = log.action.toLowerCase().includes(q);
      const matchUser = log.userName.toLowerCase().includes(q);
      const matchRecord = log.recordId?.toLowerCase().includes(q);
      const matchModule = log.module.toLowerCase().includes(q);
      return matchAction || matchUser || matchRecord || matchModule;
    }
    return true;
  });

  const getModuleIcon = (mod: string) => {
    switch (mod.toLowerCase()) {
      case 'invoice':
      case 'invoices':
        return <FileText className="w-4 h-4 text-amber-500" />;
      case 'payment':
      case 'payments':
        return <CreditCard className="w-4 h-4 text-emerald-500" />;
      case 'settings':
        return <Settings className="w-4 h-4 text-sky-500" />;
      case 'user':
      case 'users':
      case 'auth':
        return <Shield className="w-4 h-4 text-indigo-500" />;
      default:
        return <Layers className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <History className="w-7 h-7 text-amber-500" />
            Audit & Activity Logs
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Immutable audit record of user operations, state changes, and security events
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>{activityLogs.length} Events Recorded</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          >
            <option value="all">All Modules</option>
            {modules.map((m) => (
              <option key={m} value={m}>
                {m.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search action, user, or record..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <History className="w-12 h-12 mx-auto text-slate-300 mb-3 stroke-[1.5]" />
            <p className="text-sm font-semibold text-slate-600">No activity logs found</p>
            <p className="text-xs text-slate-400 mt-1">
              Events will be recorded automatically as users create invoices, collect payments, and adjust settings.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Module</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Record ID</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {formatDateTime(log.timestamp)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-[10px]">
                              {log.userName.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-slate-800">{log.userName}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-semibold text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
                            {getModuleIcon(log.module)}
                            {log.module}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-800">
                          {log.action}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                          {log.recordId || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {log.metadata && Object.keys(log.metadata).length > 0 ? (
                            <button
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              className="text-amber-600 hover:text-amber-700 font-semibold cursor-pointer underline"
                            >
                              {isExpanded ? 'Hide' : 'View Payload'}
                            </button>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </tr>

                      {isExpanded && log.metadata && (
                        <tr className="bg-slate-50/90">
                          <td colSpan={6} className="p-4">
                            <div className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-xs overflow-x-auto shadow-inner">
                              <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
