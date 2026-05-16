import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Package, ClipboardList, TrendingUp, UserCheck, Banknote, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import StatCard from '../../contexts/StatCard';

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
  totalEmployees: number;
  presentToday: number;
  totalSalaryExpenses: number;
  totalDebts: number;
}

export default function AdminDashboard({ onViewBranch }: { onViewBranch: (branch: Profile) => void }) {
  const [branches, setBranches] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<Stats>({
    branchCount: 0,
    productCount: 0,
    pendingRequests: 0,
    totalSales: 0,
    totalEmployees: 0,
    presentToday: 0,
    totalSalaryExpenses: 0,
    totalDebts: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    const today = new Date().toISOString().split('T')[0];

    const [
      branchesRes,
      productsRes,
      requestsRes,
      salesRes,
      empRes,
      attRes,
      debtRes
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'branch').order('created_at', { ascending: false }),
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('stock_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('sales').select('total'),
      supabase.from('employees').select('salary_rate', { count: 'exact' }).eq('is_active', true),
      supabase.from('attendance').select('id', { count: 'exact' }).eq('date', today),
      supabase.from('debts').select('remaining_balance').eq('is_fully_paid', false),
    ]);

    const totalSales =
      salesRes.data?.reduce((sum, s) => sum + Number(s.total), 0) || 0;

    const totalSalary =
      (empRes.data || []).reduce((sum, e) => sum + Number(e.salary_rate), 0);

    const totalDebts =
      (debtRes.data || []).reduce((sum, d) => sum + Number(d.remaining_balance), 0);

    setBranches(branchesRes.data || []);

    setStats({
      branchCount: branchesRes.data?.length || 0,
      productCount: productsRes.count || 0,
      pendingRequests: requestsRes.count || 0,
      totalSales,
      totalEmployees: empRes.count || 0,
      presentToday: attRes.count || 0,
      totalSalaryExpenses: totalSalary,
      totalDebts,
    });

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const statCards = [
    { label: 'Branches', value: stats.branchCount, icon: <Users className="w-5 h-5" />, color: 'emerald' },
    { label: 'Products', value: stats.productCount, icon: <Package className="w-5 h-5" />, color: 'blue' },
    { label: 'Pending Requests', value: stats.pendingRequests, icon: <ClipboardList className="w-5 h-5" />, color: 'amber' },
    { label: 'Total Revenue', value: formatCurrency(stats.totalSales), icon: <TrendingUp className="w-5 h-5" />, color: 'teal' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Overview of your system</p>
      </div>

      {/* StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard label="Total Employees" value={stats.totalEmployees} icon={Users} color="blue" />
        <StatCard label="Present Today" value={stats.presentToday} icon={UserCheck} color="emerald" />
        <StatCard label="Total Salary Rate/Day" value={formatCurrency(stats.totalSalaryExpenses)} icon={Banknote} color="amber" />
        <StatCard label="Total Employee Debts" value={formatCurrency(stats.totalDebts)} icon={AlertTriangle} color="rose" />
      </div>

      {/* Old stat cards */}
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

      {/* Branches Table */}
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
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Branch Name</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Location</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Username</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {branches.map((branch) => (
                  <tr key={branch.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{branch.branch_name}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{branch.location}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{branch.username}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => onViewBranch(branch)}
                        className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
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