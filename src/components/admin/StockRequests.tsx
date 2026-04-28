import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Check, X as XIcon, Clock, Loader2 } from 'lucide-react';

interface StockRequest {
  id: string;
  branch_id: string;
  product_id: string;
  quantity: number;
  status: string;
  created_at: string;
  resolved_at: string | null;
  profiles: { branch_name: string; username: string };
  products: { name: string; stock: number };
}

export default function StockRequests() {
  const [requests, setRequests] = useState<StockRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    const { data } = await supabase
      .from('stock_requests')
      .select('*, profiles(branch_name, username), products(name, stock)')
      .order('created_at', { ascending: false });
    setRequests(data || []);
    setLoading(false);
  };

  const handleAction = async (requestId: string, action: 'approved' | 'rejected') => {
    setProcessing(requestId);
    try {
      const request = requests.find((r) => r.id === requestId);
      if (!request) throw new Error('Request not found');

      // Update the request status
      const { error: updateError } = await supabase
        .from('stock_requests')
        .update({ status: action, resolved_at: new Date().toISOString() })
        .eq('id', requestId);
      if (updateError) throw updateError;

      if (action === 'approved') {
        const currentStock = request.products.stock;
        if (currentStock < request.quantity) {
          throw new Error(`Insufficient global stock (available: ${currentStock}, requested: ${request.quantity})`);
        }

        // Deduct from global product stock
        const { error: productError } = await supabase
          .from('products')
          .update({ stock: currentStock - request.quantity, updated_at: new Date().toISOString() })
          .eq('id', request.product_id);
        if (productError) throw productError;

        // Add to branch stock (upsert)
        const { data: existingBranchStock } = await supabase
          .from('branch_stock')
          .select('id, stock')
          .eq('product_id', request.product_id)
          .eq('branch_id', request.branch_id)
          .maybeSingle();

        if (existingBranchStock) {
          await supabase
            .from('branch_stock')
            .update({ stock: existingBranchStock.stock + request.quantity, updated_at: new Date().toISOString() })
            .eq('id', existingBranchStock.id);
        } else {
          await supabase
            .from('branch_stock')
            .insert({ product_id: request.product_id, branch_id: request.branch_id, stock: request.quantity });
        }

        // Log activity
        await supabase.from('activity_logs').insert({
          branch_id: request.branch_id,
          action: 'stock_request_approved',
          details: `Stock request for ${request.products.name} (qty: ${request.quantity}) was approved`,
        });

        // Notify branch
        await supabase.from('notifications').insert({
          branch_id: request.branch_id,
          message: `Your stock request for ${request.products.name} (qty: ${request.quantity}) was approved`,
        });
      } else {
        // Log rejection
        await supabase.from('activity_logs').insert({
          branch_id: request.branch_id,
          action: 'stock_request_rejected',
          details: `Stock request for ${request.products.name} (qty: ${request.quantity}) was rejected`,
        });

        await supabase.from('notifications').insert({
          branch_id: request.branch_id,
          message: `Your stock request for ${request.products.name} (qty: ${request.quantity}) was rejected`,
        });
      }

      loadRequests();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to process request');
    } finally {
      setProcessing(null);
    }
  };

  const filtered = filter === 'all' ? requests : requests.filter((r) => r.status === filter);

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700"><Clock className="w-3 h-3" />Pending</span>;
      case 'approved': return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700"><Check className="w-3 h-3" />Approved</span>;
      case 'rejected': return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700"><XIcon className="w-3 h-3" />Rejected</span>;
      default: return null;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Stock Requests</h1>

      <div className="flex gap-2 mb-4">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors capitalize ${
              filter === f ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Branch</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Quantity</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-slate-900">{r.profiles?.branch_name || 'Unknown'}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{r.products?.name || 'Unknown'}</td>
                <td className="px-6 py-4 text-sm text-slate-600 text-right">{r.quantity}</td>
                <td className="px-6 py-4">{statusBadge(r.status)}</td>
                <td className="px-6 py-4 text-sm text-slate-400">{new Date(r.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-right">
                  {r.status === 'pending' ? (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleAction(r.id, 'approved')}
                        disabled={processing === r.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                      >
                        {processing === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(r.id, 'rejected')}
                        disabled={processing === r.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        <XIcon className="w-3 h-3" />
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">Resolved</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">No stock requests found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
