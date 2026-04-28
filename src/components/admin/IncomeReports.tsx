import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, TrendingUp } from 'lucide-react';

interface SaleRow {
  branch_id: string;
  total: number;
  created_at: string;
  profiles: { branch_name: string };
}

interface BranchReport {
  branch_name: string;
  branch_id: string;
  total: number;
  count: number;
}

export default function IncomeReports() {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [reports, setReports] = useState<BranchReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [grandTotal, setGrandTotal] = useState(0);

  useEffect(() => {
    loadReports();
  }, [period]);

  const loadReports = async () => {
    setLoading(true);
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const { data } = await supabase
      .from('sales')
      .select('*, profiles(branch_name)')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (data) {
      const branchMap: Record<string, BranchReport> = {};
      let total = 0;
      (data as SaleRow[]).forEach((sale) => {
        const name = sale.profiles?.branch_name || 'Unknown';
        if (!branchMap[sale.branch_id]) {
          branchMap[sale.branch_id] = { branch_name: name, branch_id: sale.branch_id, total: 0, count: 0 };
        }
        branchMap[sale.branch_id].total += Number(sale.total);
        branchMap[sale.branch_id].count += 1;
        total += Number(sale.total);
      });
      setReports(Object.values(branchMap).sort((a, b) => b.total - a.total));
      setGrandTotal(total);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Income Reports</h1>

      <div className="flex gap-2 mb-6">
        {(['daily', 'weekly', 'monthly'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors capitalize ${
              period === p ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-4 h-4" />
            {p}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">Total Revenue</span>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <span className="text-sm font-medium text-slate-500">Total Transactions</span>
          <p className="text-3xl font-bold text-slate-900 mt-2">{reports.reduce((s, r) => s + r.count, 0)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <span className="text-sm font-medium text-slate-500">Active Branches</span>
          <p className="text-3xl font-bold text-slate-900 mt-2">{reports.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Branch</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Transactions</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.branch_id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-slate-900">{r.branch_name}</td>
                <td className="px-6 py-4 text-sm text-slate-600 text-right">{r.count}</td>
                <td className="px-6 py-4 text-sm font-semibold text-slate-900 text-right">${r.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
            {reports.length === 0 && (
              <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400">No sales data for this period</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
