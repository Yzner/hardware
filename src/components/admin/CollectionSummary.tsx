import { useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Calendar, DollarSign, TrendingUp, TrendingDown, CreditCard,
  Wallet, Search, Download, X, CheckCircle, AlertCircle, ChevronDown, ChevronUp, BookOpen
} from 'lucide-react';

interface BranchRow {
  branch_id: string;
  branch_name: string;
  total_sales: number;
  total_cost: number;
  total_profit: number;
  amount_received: number;
  remaining_balance: number;
}

interface Collection {
  id: string;
  branch_id: string;
  amount: number;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
  period_from: string;
  period_to: string;
  created_at: string;
}

interface PaymentForm {
  amount: string;
  payment_method: string;
  reference_number: string;
  notes: string;
}

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'GCash', 'Maya', 'Cheque', 'Other'];

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const toISO = (d: Date) => d.toISOString().slice(0, 10);

export default function CollectionSummary() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [dateFrom, setDateFrom] = useState(toISO(firstOfMonth));
  const [dateTo, setDateTo] = useState(toISO(today));
  const [rows, setRows] = useState<BranchRow[]>([]);
  const [generated, setGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<keyof BranchRow>('branch_name');
  const [sortAsc, setSortAsc] = useState(true);

  const [modalBranch, setModalBranch] = useState<BranchRow | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({ amount: '', payment_method: 'Cash', reference_number: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const generateReport = useCallback(async () => {
    if (!dateFrom || !dateTo) return;
    setLoading(true);
    setError(null);
    setGenerated(false);

    const startTs = dateFrom + 'T00:00:00.000Z';
    const endTs = dateTo + 'T23:59:59.999Z';

    const [salesRes, collectionsRes] = await Promise.all([
      supabase
        .from('sales')
        .select('branch_id, total, sale_items(unit_cost_price, unit_price, quantity, products(cost_price)), branch:profiles!sales_branch_id_fkey(branch_name)')
        .gte('created_at', startTs)
        .lte('created_at', endTs),
      supabase
        .from('branch_collections')
        .select('*')
        .gte('period_from', dateFrom)
        .lte('period_to', dateTo),
    ]);

    if (salesRes.error) { setError(salesRes.error.message); setLoading(false); return; }

    const branchSales: Record<string, { branch_name: string; sales: number; cost: number }> = {};
    for (const sale of (salesRes.data || [])) {
      const bid = sale.branch_id;
      const bname = (sale.branch as { branch_name: string } | null)?.branch_name || 'Unknown';
      if (!branchSales[bid]) branchSales[bid] = { branch_name: bname, sales: 0, cost: 0 };
      let rev = 0; let cost = 0;
      const items = (sale.sale_items as { unit_cost_price: number; unit_price: number; quantity: number; products: { cost_price: number } | null }[]) || [];
      if (items.length > 0) {
        items.forEach(it => {
          rev += Number(it.unit_price) * it.quantity;
          const cp = Number(it.unit_cost_price) > 0 ? Number(it.unit_cost_price) : Number(it.products?.cost_price || 0);
          cost += cp * it.quantity;
        });
      } else {
        rev = Number(sale.total);
      }
      branchSales[bid].sales += rev;
      branchSales[bid].cost += cost;
    }

    const collections: Collection[] = collectionsRes.data || [];
    const branchReceived: Record<string, number> = {};
    for (const c of collections) {
      branchReceived[c.branch_id] = (branchReceived[c.branch_id] || 0) + Number(c.amount);
    }

    const result: BranchRow[] = Object.entries(branchSales).map(([bid, v]) => {
      const received = branchReceived[bid] || 0;
      return {
        branch_id: bid,
        branch_name: v.branch_name,
        total_sales: v.sales,
        total_cost: v.cost,
        total_profit: v.sales - v.cost,
        amount_received: received,
        remaining_balance: v.sales - received,
      };
    });

    setRows(result);
    setGenerated(true);
    setLoading(false);
  }, [dateFrom, dateTo]);

  const handleSort = (field: keyof BranchRow) => {
    if (sortField === field) setSortAsc(a => !a);
    else { setSortField(field); setSortAsc(true); }
  };

  const filtered = rows
    .filter(r => r.branch_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const av = a[sortField]; const bv = b[sortField];
      if (typeof av === 'string' && typeof bv === 'string')
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortAsc ? (Number(av) - Number(bv)) : (Number(bv) - Number(av));
    });

  const totals = rows.reduce(
    (acc, r) => ({
      sales: acc.sales + r.total_sales,
      cost: acc.cost + r.total_cost,
      profit: acc.profit + r.total_profit,
      received: acc.received + r.amount_received,
      remaining: acc.remaining + r.remaining_balance,
    }),
    { sales: 0, cost: 0, profit: 0, received: 0, remaining: 0 }
  );

  const openPaymentModal = (branch: BranchRow) => {
    setModalBranch(branch);
    setPaymentForm({ amount: '', payment_method: 'Cash', reference_number: '', notes: '' });
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleSavePayment = async () => {
    if (!modalBranch) return;
    const amt = parseFloat(paymentForm.amount);
    if (!amt || amt <= 0) { setSaveError('Please enter a valid amount.'); return; }
    setSaving(true); setSaveError(null);

    const { error: insErr } = await supabase.from('branch_collections').insert({
      branch_id: modalBranch.branch_id,
      amount: amt,
      payment_method: paymentForm.payment_method,
      reference_number: paymentForm.reference_number || null,
      notes: paymentForm.notes || null,
      period_from: dateFrom,
      period_to: dateTo,
    });

    if (insErr) {
      setSaveError(insErr.message);
      setSaving(false);
      return;
    }

    setRows(prev => prev.map(r => {
      if (r.branch_id !== modalBranch.branch_id) return r;
      const newReceived = r.amount_received + amt;
      return { ...r, amount_received: newReceived, remaining_balance: r.total_sales - newReceived };
    }));

    setSaveSuccess(true);
    setSaving(false);
    setTimeout(() => { setModalBranch(null); }, 1200);
  };

  const exportCSV = () => {
    const header = ['Branch Name', 'Total Sales', 'Total Cost', 'Total Profit', 'Amount Received', 'Remaining Balance'];
    const csvRows = [
      header.join(','),
      ...filtered.map(r => [
        `"${r.branch_name}"`,
        r.total_sales.toFixed(2),
        r.total_cost.toFixed(2),
        r.total_profit.toFixed(2),
        r.amount_received.toFixed(2),
        r.remaining_balance.toFixed(2),
      ].join(','))
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `collection-summary-${dateFrom}-to-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const html = `<!DOCTYPE html><html><head><title>Collection Summary</title>
<style>
  body { font-family: Arial, sans-serif; padding: 24px; color: #1e293b; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .period { color: #64748b; font-size: 13px; margin-bottom: 20px; }
  .cards { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
  .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 20px; min-width: 140px; }
  .card-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: .05em; }
  .card-value { font-size: 18px; font-weight: 700; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #f8fafc; text-align: left; padding: 8px 12px; font-size: 11px; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; }
  td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
  .num { text-align: right; }
  tfoot td { font-weight: 700; background: #f8fafc; }
</style></head><body>
<h1>Collection Summary Report</h1>
<div class="period">Period: ${dateFrom} to ${dateTo}</div>
<div class="cards">
  <div class="card"><div class="card-label">Total Sales</div><div class="card-value">&#8369;${fmt(totals.sales)}</div></div>
  <div class="card"><div class="card-label">Total Cost</div><div class="card-value">&#8369;${fmt(totals.cost)}</div></div>
  <div class="card"><div class="card-label">Total Profit</div><div class="card-value">&#8369;${fmt(totals.profit)}</div></div>
  <div class="card"><div class="card-label">Amount Received</div><div class="card-value">&#8369;${fmt(totals.received)}</div></div>
  <div class="card"><div class="card-label">Remaining Balance</div><div class="card-value">&#8369;${fmt(totals.remaining)}</div></div>
</div>
<table>
  <thead><tr>
    <th>Branch Name</th><th class="num">Total Sales</th><th class="num">Total Cost</th>
    <th class="num">Total Profit</th><th class="num">Amount Received</th><th class="num">Remaining</th>
  </tr></thead>
  <tbody>
    ${filtered.map(r => `<tr>
      <td>${r.branch_name}</td>
      <td class="num">&#8369;${fmt(r.total_sales)}</td>
      <td class="num">&#8369;${fmt(r.total_cost)}</td>
      <td class="num">&#8369;${fmt(r.total_profit)}</td>
      <td class="num">&#8369;${fmt(r.amount_received)}</td>
      <td class="num">&#8369;${fmt(r.remaining_balance)}</td>
    </tr>`).join('')}
  </tbody>
  <tfoot><tr>
    <td>TOTAL</td>
    <td class="num">&#8369;${fmt(totals.sales)}</td>
    <td class="num">&#8369;${fmt(totals.cost)}</td>
    <td class="num">&#8369;${fmt(totals.profit)}</td>
    <td class="num">&#8369;${fmt(totals.received)}</td>
    <td class="num">&#8369;${fmt(totals.remaining)}</td>
  </tr></tfoot>
</table>
</body></html>`;
    win.document.write(html);
    win.document.close();
    win.print();
  };

  const SortIcon = ({ field }: { field: keyof BranchRow }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 opacity-30 inline ml-1" />;
    return sortAsc
      ? <ChevronUp className="w-3 h-3 text-emerald-500 inline ml-1" />
      : <ChevronDown className="w-3 h-3 text-emerald-500 inline ml-1" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Collection Summary</h1>
          <p className="text-sm text-slate-500 mt-0.5">Generate and track branch payment collections by date range</p>
        </div>
      </div>

      {/* Date Range Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date From</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-slate-50"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date To</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-slate-50"
              />
            </div>
          </div>
          <button
            onClick={generateReport}
            disabled={loading || !dateFrom || !dateTo}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <TrendingUp className="w-4 h-4" />
            )}
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
        {error && (
          <div className="mt-3 flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>

      {generated && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <SummaryCard label="Total Cost" value={totals.cost} icon={<TrendingDown className="w-4 h-4" />} color="rose" />
            <SummaryCard label="Total Sales" value={totals.sales} icon={<DollarSign className="w-4 h-4" />} color="blue" />
            <SummaryCard label="Total Profit" value={totals.profit} icon={<TrendingUp className="w-4 h-4" />} color="emerald" />
            <SummaryCard label="Amount Received" value={totals.received} icon={<CreditCard className="w-4 h-4" />} color="teal" />
            <SummaryCard label="Remaining Balance" value={totals.remaining} icon={<Wallet className="w-4 h-4" />} color={totals.remaining > 0 ? 'amber' : 'slate'} />
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by branch..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent w-56 bg-slate-50"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
                <button
                  onClick={exportPDF}
                  className="flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export PDF
                </button>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                {rows.length === 0 ? 'No sales found for the selected period.' : 'No branches match your search.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {([
                        ['branch_name', 'Branch Name'],
                        ['total_sales', 'Total Sales'],
                        ['total_cost', 'Total Cost'],
                        ['total_profit', 'Total Profit'],
                        ['amount_received', 'Amt Received'],
                        ['remaining_balance', 'Remaining'],
                      ] as [keyof BranchRow, string][]).map(([field, label]) => (
                        <th
                          key={field}
                          onClick={() => handleSort(field)}
                          className={`px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 select-none ${field === 'branch_name' ? 'text-left' : 'text-right'}`}
                        >
                          {label}<SortIcon field={field} />
                        </th>
                      ))}
                      <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(row => (
                      <tr key={row.branch_id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-4 text-sm font-semibold text-slate-900">{row.branch_name}</td>
                        <td className="px-5 py-4 text-sm text-right text-slate-700 font-medium">&#8369;{fmt(row.total_sales)}</td>
                        <td className="px-5 py-4 text-sm text-right text-rose-600 font-medium">&#8369;{fmt(row.total_cost)}</td>
                        <td className={`px-5 py-4 text-sm text-right font-semibold ${row.total_profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          &#8369;{fmt(row.total_profit)}
                        </td>
                        <td className="px-5 py-4 text-sm text-right text-teal-600 font-medium">&#8369;{fmt(row.amount_received)}</td>
                        <td className="px-5 py-4 text-sm text-right">
                          <span className={`font-semibold ${row.remaining_balance > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                            &#8369;{fmt(row.remaining_balance)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <button
                            onClick={() => openPaymentModal(row)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold rounded-lg transition-colors border border-emerald-200"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            Receive Payment
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t-2 border-slate-200">
                      <td className="px-5 py-3.5 text-xs font-bold text-slate-600 uppercase tracking-wider">Total</td>
                      <td className="px-5 py-3.5 text-sm text-right font-bold text-slate-900">&#8369;{fmt(totals.sales)}</td>
                      <td className="px-5 py-3.5 text-sm text-right font-bold text-rose-600">&#8369;{fmt(totals.cost)}</td>
                      <td className={`px-5 py-3.5 text-sm text-right font-bold ${totals.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>&#8369;{fmt(totals.profit)}</td>
                      <td className="px-5 py-3.5 text-sm text-right font-bold text-teal-600">&#8369;{fmt(totals.received)}</td>
                      <td className={`px-5 py-3.5 text-sm text-right font-bold ${totals.remaining > 0 ? 'text-amber-600' : 'text-slate-400'}`}>&#8369;{fmt(totals.remaining)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Payment Modal */}
      {modalBranch && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Receive Payment</h2>
                <p className="text-sm text-slate-500 mt-0.5">{modalBranch.branch_name}</p>
              </div>
              <button
                onClick={() => setModalBranch(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-4">
              <div className="grid grid-cols-2 gap-3 mb-5 p-3 bg-slate-50 rounded-xl">
                <div>
                  <span className="text-xs text-slate-500">Total Sales</span>
                  <p className="text-sm font-bold text-slate-900">&#8369;{fmt(modalBranch.total_sales)}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Remaining Balance</span>
                  <p className={`text-sm font-bold ${modalBranch.remaining_balance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    &#8369;{fmt(modalBranch.remaining_balance)}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Amount Received <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={paymentForm.amount}
                    onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={paymentForm.payment_method}
                    onChange={e => setPaymentForm(f => ({ ...f, payment_method: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                  >
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Reference Number <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TXN-123456"
                    value={paymentForm.reference_number}
                    onChange={e => setPaymentForm(f => ({ ...f, reference_number: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Notes <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Any additional notes..."
                    value={paymentForm.notes}
                    onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>

              {saveError && (
                <div className="mt-3 flex items-start gap-2 text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {saveError}
                </div>
              )}
              {saveSuccess && (
                <div className="mt-3 flex items-center gap-2 text-emerald-700 text-sm bg-emerald-50 rounded-lg px-3 py-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  Payment recorded successfully!
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setModalBranch(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePayment}
                disabled={saving || saveSuccess}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {saving ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <CreditCard className="w-4 h-4" />
                )}
                {saving ? 'Saving...' : 'Save Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon, color }: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: 'emerald' | 'blue' | 'rose' | 'teal' | 'amber' | 'slate';
}) {
  const colors: Record<string, { bg: string; text: string; border: string; value: string }> = {
    emerald: { bg: 'bg-emerald-50 text-emerald-600', text: 'text-emerald-700', border: 'border-emerald-100', value: 'text-emerald-700' },
    blue: { bg: 'bg-blue-50 text-blue-600', text: 'text-blue-700', border: 'border-blue-100', value: 'text-blue-700' },
    rose: { bg: 'bg-rose-50 text-rose-600', text: 'text-rose-700', border: 'border-rose-100', value: 'text-rose-700' },
    teal: { bg: 'bg-teal-50 text-teal-600', text: 'text-teal-700', border: 'border-teal-100', value: 'text-teal-700' },
    amber: { bg: 'bg-amber-50 text-amber-600', text: 'text-amber-700', border: 'border-amber-100', value: 'text-amber-700' },
    slate: { bg: 'bg-slate-100 text-slate-500', text: 'text-slate-500', border: 'border-slate-200', value: 'text-slate-500' },
  };
  const c = colors[color];
  return (
    <div className={`bg-white rounded-xl border p-4 ${c.border}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider leading-tight">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.bg}`}>
          {icon}
        </div>
      </div>
      <p className={`text-xl font-bold ${c.value}`}>&#8369;{value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
    </div>
  );
}
