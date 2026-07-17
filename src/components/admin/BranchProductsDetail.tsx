import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  ArrowLeft, Package, DollarSign, TrendingUp, Boxes,
  AlertCircle, Search, ChevronDown, ChevronUp, PackageCheck, ShoppingCart, Wallet
} from 'lucide-react';

interface Profile {
  id: string;
  username: string;
  branch_name: string | null;
  location: string | null;
}

type SortField = 'name' | 'cost_price' | 'price' | 'stock' | 'total_received' | 'total_sold' | 'total_cost' | 'total_value';

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface ProductRow {
  id: string;
  product_id: string;
  name: string;
  unit: string;
  cost_price: number;
  price: number;
  stock: number;
  total_received: number;
  total_sold: number;
  total_cost: number;
  total_value: number;
}

export default function BranchProductsDetail({ branch, onBack }: { branch: Profile; onBack: () => void }) {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. All products (for name/price/cost/unit)
      const { data: products, error: productsErr } = await supabase
        .from('products')
        .select('id, name, price, cost_price, unit');
      if (productsErr) throw productsErr;

      // 2. Current branch stock
      const { data: stockData, error: stockErr } = await supabase
        .from('branch_stock')
        .select('product_id, stock')
        .eq('branch_id', branch.id);
      if (stockErr) throw stockErr;

      // 3. All approved stock requests for this branch (total received from start)
      const { data: requests, error: reqErr } = await supabase
        .from('stock_requests')
        .select('product_id, quantity')
        .eq('branch_id', branch.id)
        .eq('status', 'approved');
      if (reqErr) throw reqErr;

      // 4. All sale items for this branch (total sold from start)
      const { data: sales, error: salesErr } = await supabase
        .from('sales')
        .select('id')
        .eq('branch_id', branch.id);
      if (salesErr) throw salesErr;

      let totalSoldMap: Record<string, number> = {};
      if (sales && sales.length > 0) {
        const saleIds = sales.map(s => s.id);
        const { data: saleItems, error: itemsErr } = await supabase
          .from('sale_items')
          .select('product_id, quantity')
          .in('sale_id', saleIds);
        if (itemsErr) throw itemsErr;
        (saleItems || []).forEach((si: { product_id: string; quantity: number }) => {
          totalSoldMap[si.product_id] = (totalSoldMap[si.product_id] || 0) + Number(si.quantity);
        });
      }

      // Build maps
      const stockMap: Record<string, number> = {};
      (stockData || []).forEach((s: { product_id: string; stock: number }) => {
        stockMap[s.product_id] = Number(s.stock || 0);
      });

      const receivedMap: Record<string, number> = {};
      (requests || []).forEach((r: { product_id: string; quantity: number }) => {
        receivedMap[r.product_id] = (receivedMap[r.product_id] || 0) + Number(r.quantity);
      });

      // Include any product that has been received, has stock, or has been sold
      const productIds = new Set<string>([
        ...Object.keys(stockMap),
        ...Object.keys(receivedMap),
        ...Object.keys(totalSoldMap),
      ]);

      const productMap: Record<string, { name: string; price: number; cost_price: number; unit: string }> = {};
      (products || []).forEach((p: { id: string; name: string; price: number; cost_price: number; unit: string }) => {
        productMap[p.id] = {
          name: p.name,
          price: Number(p.price || 0),
          cost_price: Number(p.cost_price || 0),
          unit: p.unit || '',
        };
      });

      const enriched: ProductRow[] = Array.from(productIds).map((pid) => {
        const prod = productMap[pid] || { name: 'Unknown', price: 0, cost_price: 0, unit: '' };
        const stock = stockMap[pid] || 0;
        const totalReceived = receivedMap[pid] || 0;
        const totalSold = totalSoldMap[pid] || 0;
        return {
          id: pid,
          product_id: pid,
          name: prod.name,
          unit: prod.unit,
          cost_price: prod.cost_price,
          price: prod.price,
          stock,
          total_received: totalReceived,
          total_sold: totalSold,
          total_cost: prod.cost_price * stock,
          total_value: prod.price * stock,
        };
      });

      setRows(enriched);
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const filtered = rows
    .filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else cmp = a[sortField] - b[sortField];
      return sortAsc ? cmp : -cmp;
    });

  const totalCost = rows.reduce((s, r) => s + r.total_cost, 0);
  const totalValue = rows.reduce((s, r) => s + r.total_value, 0);
  const potentialProfit = rows.reduce((s, r) => s + (r.price - r.cost_price) * r.stock, 0);
  const totalReceived = rows.reduce((s, r) => s + r.total_received, 0);
  const totalSold = rows.reduce((s, r) => s + r.total_sold, 0);
  const totalUnits = rows.reduce((s, r) => s + r.stock, 0);
  const productCount = rows.length;

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortAsc((a) => !a);
    else { setSortField(field); setSortAsc(true); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 opacity-30 inline ml-1" />;
    return sortAsc
      ? <ChevronUp className="w-3 h-3 text-emerald-500 inline ml-1" />
      : <ChevronDown className="w-3 h-3 text-emerald-500 inline ml-1" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
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
        <h1 className="text-2xl font-bold text-slate-900">{branch.branch_name} — Products</h1>
        <p className="text-slate-500 text-sm mt-1">{branch.location} &middot; @{branch.username}</p>
        <p className="text-xs text-slate-400 mt-1">Showing totals received and sold from the very start (all-time)</p>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Received</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <PackageCheck className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-blue-600">{totalReceived.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">Units received from start</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Sold</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{totalSold.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">Units sold from start</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Inventory Cost</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-rose-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-600">${fmt(totalCost)}</p>
          <p className="text-xs text-slate-400 mt-1">Cost of current stock</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Potential Profit</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600">${fmt(potentialProfit)}</p>
          <p className="text-xs text-slate-400 mt-1">If all current stock sold</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock Value</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-600">${fmt(totalValue)}</p>
          <p className="text-xs text-slate-400 mt-1">Retail value of current stock</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Products / Units</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <Boxes className="w-4 h-4 text-slate-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800">{productCount} <span className="text-base text-slate-400 font-medium">/ {totalUnits.toLocaleString()}</span></p>
          <p className="text-xs text-slate-400 mt-1">Product types / current units</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          placeholder="Search products..."
        />
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th onClick={() => handleSort('name')} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 select-none">
                  Product<SortIcon field="name" />
                </th>
                <th onClick={() => handleSort('cost_price')} className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 select-none">
                  Cost Price<SortIcon field="cost_price" />
                </th>
                <th onClick={() => handleSort('price')} className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 select-none">
                  Selling Price<SortIcon field="price" />
                </th>
                <th onClick={() => handleSort('total_received')} className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 select-none">
                  Total Received<SortIcon field="total_received" />
                </th>
                <th onClick={() => handleSort('total_sold')} className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 select-none">
                  Total Sold<SortIcon field="total_sold" />
                </th>
                <th onClick={() => handleSort('stock')} className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 select-none">
                  Current Stock<SortIcon field="stock" />
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit</th>
                <th onClick={() => handleSort('total_value')} className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 select-none">
                  Stock Value<SortIcon field="total_value" />
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Potential Profit
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const margin = r.price - r.cost_price;
                return (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        {r.name}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-600 text-right">${fmt(r.cost_price)}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-600 text-right">${fmt(r.price)}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-blue-600 text-right">
                      {r.total_received.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-emerald-600 text-right">
                      {r.total_sold.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold ${
                        r.stock > 10 ? 'bg-emerald-50 text-emerald-700' : r.stock > 0 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {r.stock.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-500">{r.unit}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-amber-600 text-right">${fmt(r.total_value)}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-emerald-600 text-right">${fmt((r.price - r.cost_price) * r.stock)}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-5 py-8 text-center text-slate-400">
                  {rows.length === 0 ? 'No products have been assigned to this branch yet.' : 'No products match your search.'}
                </td></tr>
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td colSpan={3} className="px-5 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Totals ({filtered.length} products)
                  </td>
                  <td className="px-5 py-3 text-sm font-bold text-blue-600 text-right">{filtered.reduce((s, r) => s + r.total_received, 0).toLocaleString()}</td>
                  <td className="px-5 py-3 text-sm font-bold text-emerald-600 text-right">{filtered.reduce((s, r) => s + r.total_sold, 0).toLocaleString()}</td>
                  <td className="px-5 py-3 text-sm font-bold text-slate-800 text-right">{filtered.reduce((s, r) => s + r.stock, 0).toLocaleString()}</td>
                  <td />
                  <td className="px-5 py-3 text-sm font-bold text-amber-600 text-right">${fmt(filtered.reduce((s, r) => s + r.total_value, 0))}</td>
                  <td className="px-5 py-3 text-sm font-bold text-emerald-600 text-right">${fmt(filtered.reduce((s, r) => s + (r.price - r.cost_price) * r.stock, 0))}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
