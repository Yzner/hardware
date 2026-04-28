import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Package, ClipboardList, TrendingUp } from 'lucide-react';

interface Profile {
  id: string;
  username: string;
  role: string;
  branch_name: string | null;
  location: string | null;
  created_at: string;
}

interface Stats {
  branchCount: number;
  productCount: number;
  pendingRequests: number;
  totalSales: number;
}

export default function AdminDashboard({ onViewBranch }: { onViewBranch: (branch: Profile) => void }) {
  const [branches, setBranches] = useState<Profile[]>([]);
  const [stats, setStats] = useState<Stats>({ branchCount: 0, productCount: 0, pendingRequests: 0, totalSales: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [branchesRes, productsRes, requestsRes, salesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'branch').order('created_at', { ascending: false }),
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('stock_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('sales').select('total'),
    ]);

    setBranches(branchesRes.data || []);
    setStats({
      branchCount: branchesRes.data?.length || 0,
      productCount: productsRes.count || 0,
      pendingRequests: requestsRes.count || 0,
      totalSales: salesRes.data?.reduce((sum, s) => sum + Number(s.total), 0) || 0,
    });
    setLoading(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" /></div>;
  }

  const statCards = [
    { label: 'Branches', value: stats.branchCount, icon: <Users className="w-5 h-5" />, color: 'emerald' },
    { label: 'Products', value: stats.productCount, icon: <Package className="w-5 h-5" />, color: 'blue' },
    { label: 'Pending Requests', value: stats.pendingRequests, icon: <ClipboardList className="w-5 h-5" />, color: 'amber' },
    { label: 'Total Revenue', value: `$${stats.totalSales.toLocaleString()}`, icon: <TrendingUp className="w-5 h-5" />, color: 'teal' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-500">{card.label}</span>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                card.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                card.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                card.color === 'amber' ? 'bg-amber-50 text-amber-600' :
                'bg-teal-50 text-teal-600'
              }`}>
                {card.icon}
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Branches</h2>
        </div>
        {branches.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No branches created yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Branch Name</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Location</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Username</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {branches.map((branch) => (
                  <tr key={branch.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{branch.branch_name}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{branch.location}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{branch.username}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => onViewBranch(branch)}
                        className="text-emerald-600 hover:text-emerald-700 text-sm font-medium transition-colors"
                      >
                        View Activity
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
