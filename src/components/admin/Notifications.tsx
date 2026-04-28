import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase'; 
import { Send, Loader2 } from 'lucide-react';

interface Profile {
  id: string;
  username: string;
  branch_name: string | null;
}

interface Notification {
  id: string;
  branch_id: string | null;
  message: string;
  read: boolean;
  created_at: string;
  profiles: { branch_name: string } | null;
}

export default function Notifications() {
  const [branches, setBranches] = useState<Profile[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [targetBranch, setTargetBranch] = useState('all');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [branchesRes, notifsRes] = await Promise.all([
      supabase.from('profiles').select('id, username, branch_name').eq('role', 'branch').order('branch_name'),
      supabase.from('notifications').select('*, profiles(branch_name)').order('created_at', { ascending: false }).limit(50),
    ]);
    setBranches(branchesRes.data || []);
    setNotifications(notifsRes.data || []);
    setLoading(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);

    try {
      if (targetBranch === 'all') {
        for (const branch of branches) {
          await supabase.from('notifications').insert({
            branch_id: branch.id,
            message: message.trim(),
          });
        }
      } else {
        await supabase.from('notifications').insert({
          branch_id: targetBranch,
          message: message.trim(),
        });
      }
      setMessage('');
      loadData();
    } catch {
      alert('Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Notifications</h1>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Send Notification</h3>
        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Target</label>
            <select
              value={targetBranch}
              onChange={(e) => setTargetBranch(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="all">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.branch_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              placeholder="Type your notification message..."
              required
            />
          </div>
          <button
            type="submit"
            disabled={sending}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">Sent Notifications</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {notifications.map((n) => (
            <div key={n.id} className="px-6 py-4 flex items-start gap-3">
              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${n.read ? 'bg-slate-300' : 'bg-emerald-500'}`} />
              <div className="flex-1">
                <p className="text-sm text-slate-700">{n.message}</p>
                <p className="text-xs text-slate-400 mt-1">
                  To: {n.profiles?.branch_name || 'All Branches'} - {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
          {notifications.length === 0 && (
            <div className="px-6 py-8 text-center text-slate-400">No notifications sent yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
