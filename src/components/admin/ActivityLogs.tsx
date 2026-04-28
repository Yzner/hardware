import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface ActivityLog {
  id: string;
  branch_id: string;
  action: string;
  details: string;
  created_at: string;
  profiles: { branch_name: string; username: string } | null;
}

interface Profile {
  id: string;
  branch_name: string | null;
  location: string | null;
  username: string;
}

export default function ActivityLogs({ branchFilter }: { branchFilter?: Profile | null }) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, [branchFilter]);

  const loadLogs = async () => {
    setLoading(true);
    let query = supabase
      .from('activity_logs')
      .select('*, profiles(branch_name, username)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (branchFilter) {
      query = query.eq('branch_id', branchFilter.id);
    }

    const { data } = await query;
    setLogs(data || []);
    setLoading(false);
  };

  const actionColors: Record<string, string> = {
    sale_created: 'bg-emerald-50 text-emerald-700',
    stock_request_pending: 'bg-amber-50 text-amber-700',
    stock_request_approved: 'bg-emerald-50 text-emerald-700',
    stock_request_rejected: 'bg-red-50 text-red-700',
    branch_created: 'bg-blue-50 text-blue-700',
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">
        {branchFilter ? `${branchFilter.branch_name} - Activity` : 'Activity Logs'}
      </h1>
      {branchFilter && (
        <p className="text-slate-500 text-sm mb-6">{branchFilter.location}</p>
      )}

      <div className="space-y-3">
        {logs.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">No activity logs found</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-4 hover:shadow-sm transition-shadow">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold ${actionColors[log.action] || 'bg-slate-50 text-slate-700'}`}>
                    {log.action.replace(/_/g, ' ')}
                  </span>
                  {log.profiles && (
                    <span className="text-xs text-slate-400">{log.profiles.branch_name}</span>
                  )}
                </div>
                <p className="text-sm text-slate-600">{log.details}</p>
              </div>
              <span className="text-xs text-slate-400 whitespace-nowrap">
                {new Date(log.created_at).toLocaleString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
