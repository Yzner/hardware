import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Send, Clock, Check, X as XIcon, Loader2 } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  unit: string;
}

interface StockRequest {
  id: string;
  product_id: string;
  quantity: number;
  status: string;
  created_at: string;
  products: { name: string; unit: string };
}

export default function StockRequest() {
  const { profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [requests, setRequests] = useState<StockRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [productsRes, requestsRes] = await Promise.all([
      supabase.from('products').select('id, name, unit').order('name'),
      supabase.from('stock_requests').select('*, products(name, unit)').eq('branch_id', profile?.id).order('created_at', { ascending: false }),
    ]);
    setProducts(productsRes.data || []);
    setRequests(requestsRes.data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !quantity) return;
    setSubmitting(true);

    try {
      const { error } = await supabase.from('stock_requests').insert({
        branch_id: profile?.id,
        product_id: selectedProduct,
        quantity: parseInt(quantity),
      });
      if (error) throw error;

      // Log activity
      const product = products.find((p) => p.id === selectedProduct);
      await supabase.from('activity_logs').insert({
        branch_id: profile?.id,
        action: 'stock_request_pending',
        details: `Requested ${quantity} ${product?.unit || 'pcs'} of ${product?.name || 'product'}`,
      });

      setSelectedProduct('');
      setQuantity('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700"><Clock className="w-3 h-3" />Pending</span>;
      case 'approved': return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700"><Check className="w-3 h-3" />Approved</span>;
      case 'rejected': return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700"><XIcon className="w-3 h-3" />Rejected</span>;
      default: return null;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Request Stock</h1>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">New Stock Request</h3>
        <form onSubmit={handleSubmit} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Product</label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select product...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Quantity</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Qty"
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Submit
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">Request History</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Quantity</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-slate-900">{r.products?.name || 'Unknown'}</td>
                <td className="px-6 py-4 text-sm text-slate-600 text-right">{r.quantity} {r.products?.unit || ''}</td>
                <td className="px-6 py-4">{statusBadge(r.status)}</td>
                <td className="px-6 py-4 text-sm text-slate-400">{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">No stock requests yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
