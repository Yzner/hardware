import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { TrendingUp, Receipt, Calendar } from 'lucide-react';

interface Sale {
  id: string;
  total: number;
  created_at: string;
  sale_items: {
    id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    products: { name: string };
  }[];
}

export default function SalesHistory() {
  const { profile } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSale, setExpandedSale] = useState<string | null>(null);
  const [period, setPeriod] = useState<'all' | 'today' | 'week' | 'month'>('all');

  useEffect(() => {
    loadSales();
  }, [period]);

  const loadSales = async () => {
    setLoading(true);
    let query = supabase
      .from('sales')
      .select('*, sale_items(id, quantity, unit_price, subtotal, products(name))')
      .eq('branch_id', profile?.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (period === 'today') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      query = query.gte('created_at', start.toISOString());
    } else if (period === 'week') {
      const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      query = query.gte('created_at', start.toISOString());
    } else if (period === 'month') {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      query = query.gte('created_at', start.toISOString());
    }

    const { data } = await query;
    setSales(data || []);
    setLoading(false);
  };

  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total), 0);
  const totalTransactions = sales.length;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Sales History</h1>

      <div className="flex gap-2 mb-4">
        {(['all', 'today', 'week', 'month'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors capitalize ${
              period === p ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-4 h-4" />
            {p}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">Total Revenue</span>
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">Transactions</span>
            <Receipt className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{totalTransactions}</p>
        </div>
      </div>

      <div className="space-y-3">
        {sales.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">No sales found for this period</div>
        ) : (
          sales.map((sale) => (
            <div key={sale.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => setExpandedSale(expandedSale === sale.id ? null : sale.id)}
                className="w-full px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Receipt className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">Sale #{sale.id.substring(0, 8)}</p>
                  <p className="text-xs text-slate-400">{new Date(sale.created_at).toLocaleString()}</p>
                </div>
                <p className="text-lg font-bold text-slate-900">${Number(sale.total).toFixed(2)}</p>
                <svg className={`w-5 h-5 text-slate-400 transition-transform ${expandedSale === sale.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {expandedSale === sale.id && sale.sale_items && (
                <div className="px-5 pb-4 border-t border-slate-100">
                  <table className="w-full mt-3">
                    <thead>
                      <tr className="text-xs text-slate-500">
                        <th className="text-left pb-2 font-medium">Item</th>
                        <th className="text-right pb-2 font-medium">Qty</th>
                        <th className="text-right pb-2 font-medium">Price</th>
                        <th className="text-right pb-2 font-medium">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sale.sale_items.map((item) => (
                        <tr key={item.id} className="text-sm">
                          <td className="py-1.5 text-slate-700">{item.products?.name || 'Unknown'}</td>
                          <td className="py-1.5 text-right text-slate-500">{item.quantity}</td>
                          <td className="py-1.5 text-right text-slate-500">${Number(item.unit_price).toFixed(2)}</td>
                          <td className="py-1.5 text-right font-medium text-slate-900">${Number(item.subtotal).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
