import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { MapPin, Eye, Search, Boxes } from 'lucide-react';

interface Profile {
  id: string;
  username: string;
  role: string;
  branch_name: string | null;
  location: string | null;
  created_at: string;
}

interface BranchStats {
  totalSales: number;
  saleCount: number;
  productCount: number;
}

export default function AllBranches({ onViewActivity, onViewProducts }: { onViewActivity: (branch: Profile) => void; onViewProducts: (branch: Profile) => void }) {
  const [branches, setBranches] = useState<Profile[]>([]);
  const [stats, setStats] = useState<Record<string, BranchStats>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: branchData } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'branch')
      .order('branch_name');

    setBranches(branchData || []);

    if (branchData && branchData.length > 0) {
      const statsMap: Record<string, BranchStats> = {};

      const [salesRes, stockRes] = await Promise.all([
        supabase.from('sales').select('branch_id, total'),
        supabase.from('branch_stock').select('branch_id, id'),
      ]);

      (salesRes.data || []).forEach((s) => {
        if (!statsMap[s.branch_id]) statsMap[s.branch_id] = { totalSales: 0, saleCount: 0, productCount: 0 };
        statsMap[s.branch_id].totalSales += Number(s.total);
        statsMap[s.branch_id].saleCount += 1;
      });

      (stockRes.data || []).forEach((s) => {
        if (!statsMap[s.branch_id]) statsMap[s.branch_id] = { totalSales: 0, saleCount: 0, productCount: 0 };
        statsMap[s.branch_id].productCount += 1;
      });

      setStats(statsMap);
    }

    setLoading(false);
  };

  const filtered = branches.filter((b) =>
    b.branch_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.location?.toLowerCase().includes(search.toLowerCase()) ||
    b.username?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">All Branches</h1>

      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          placeholder="Search by branch name, location, or username..."
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">No branches found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((branch) => {
            const s = stats[branch.id] || { totalSales: 0, saleCount: 0, productCount: 0 };
            return (
              <div key={branch.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{branch.branch_name}</h3>
                    <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {branch.location}
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg">@{branch.username}</span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-slate-900">${s.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs text-slate-500">Revenue</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-slate-900">{s.saleCount}</p>
                    <p className="text-xs text-slate-500">Sales</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-slate-900">{s.productCount}</p>
                    <p className="text-xs text-slate-500">Products</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onViewActivity(branch)}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    Show Activity
                  </button>
                  <button
                    onClick={() => onViewProducts(branch)}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    <Boxes className="w-4 h-4" />
                    Show All Products
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
