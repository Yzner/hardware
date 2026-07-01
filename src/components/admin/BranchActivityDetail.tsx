import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Calendar, TrendingUp, Receipt, Package } from 'lucide-react';

interface Profile {
  id: string;
  username: string;
  branch_name: string | null;
  location: string | null;
}

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

interface BranchProduct {
  id: string;
  product_id: string;
  stock: number;
  updated_at: string;
  products: { name: string; price: number; unit: string }[] | { name: string; price: number; unit: string };
}

type Period = 'today' | 'weekly' | 'monthly';

const toISODate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function BranchActivityDetail({ branch, onBack }: { branch: Profile; onBack: () => void }) {
  const [period, setPeriod] = useState<Period>('today');
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<BranchProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSale, setExpandedSale] = useState<string | null>(null);
  const [rangeLabel, setRangeLabel] = useState('');

  const today = new Date();
  const [weekStart, setWeekStart] = useState(toISODate(today));
  const [monthValue, setMonthValue] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);

  useEffect(() => {
    loadData();
  }, [period, weekStart, monthValue]);

  const loadData = async () => {
    setLoading(true);

    let start: Date;
    let end: Date | null = null;
    let label = '';

    switch (period) {
      case 'today': {
        const now = new Date();
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        label = `Today (${start.toLocaleDateString()})`;
        break;
      }
      case 'weekly': {
        start = new Date(weekStart + 'T00:00:00');
        end = new Date(start);
        end.setDate(end.getDate() + 7);
        label = `Week of ${start.toLocaleDateString()} - ${new Date(end.getTime() - 1).toLocaleDateString()}`;
        break;
      }
      case 'monthly': {
        const [y, m] = monthValue.split('-').map(Number);
        start = new Date(y, m - 1, 1, 0, 0, 0, 0);
        end = new Date(y, m, 1, 0, 0, 0, 0);
        label = `${monthNames[m - 1]} ${y}`;
        break;
      }
    }

    setRangeLabel(label);

    let salesQuery = supabase
      .from('sales')
      .select('*, sale_items(id, quantity, unit_price, subtotal, products(name))')
      .eq('branch_id', branch.id)
      .gte('created_at', start.toISOString())
      .order('created_at', { ascending: false });

    if (end) {
      salesQuery = salesQuery.lt('created_at', end.toISOString());
    }

    const [salesRes, productsRes] = await Promise.all([
      salesQuery,
      supabase
        .from('branch_stock')
        .select('id, product_id, stock, updated_at, products(name, price, unit)')
        .eq('branch_id', branch.id)
        .gt('stock', 0)
        .order('products(name)'),
    ]);

    setSales(salesRes.data || []);
    setProducts(productsRes.data || []);
    setLoading(false);
  };

  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total), 0);
  const totalTransactions = sales.length;

  const getProduct = (p: BranchProduct['products']) => Array.isArray(p) ? p[0] : p;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div>
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 mb-4 font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to All Branches
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{branch.branch_name}</h1>
        <p className="text-slate-500 text-sm mt-1">{branch.location} &middot; @{branch.username}</p>
      </div>

      {/* Sales History Section */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Sales History</h2>
          <div className="flex flex-wrap items-center gap-2">
            {(['today', 'weekly', 'monthly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors capitalize ${
                  period === p ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                {p === 'today' ? 'Today' : p}
              </button>
            ))}
            {period === 'weekly' && (
              <input
                type="date"
                value={weekStart}
                onChange={(e) => setWeekStart(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            )}
            {period === 'monthly' && (
              <input
                type="month"
                value={monthValue}
                onChange={(e) => setMonthValue(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            )}
          </div>
        </div>

        <p className="text-sm text-slate-500 mb-4">
          Showing data for: <span className="font-semibold text-slate-700">{rangeLabel}</span>
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-500">Revenue</span>
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-500">Transactions</span>
              <Receipt className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{totalTransactions}</p>
          </div>
        </div>

        <div className="space-y-3">
          {sales.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">No sales for this period</div>
          ) : (
            sales.map((sale) => (
              <div key={sale.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setExpandedSale(expandedSale === sale.id ? null : sale.id)}
                  className="w-full px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <Receipt className="w-5 h-5 text-emerald-600" />
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

      {/* Available Products Section */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Available Products</h2>
        {products.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">No products in stock</div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Price</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const prod = getProduct(p.products);
                  return (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-slate-400" />
                        {prod?.name || 'Unknown'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 text-right">${Number(prod?.price || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold ${
                        p.stock > 10 ? 'bg-emerald-50 text-emerald-700' : p.stock > 0 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{prod?.unit || ''}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
