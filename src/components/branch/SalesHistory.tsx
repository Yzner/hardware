import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { TrendingUp, Receipt, Calendar, Check, X, AlertCircle, Loader2, CreditCard, DollarSign, TrendingDown, Minus } from 'lucide-react';

interface Sale {
  id: string;
  total: number;
  created_at: string;
  payment_method?: string;
  payment_status?: string;
  assigned_at?: string;
  received_at?: string;
  sale_items: {
    id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    products: { name: string };
  }[];
}

interface TrendPoint {
  label: string;
  value: number;
}

type Period = 'daily' | 'weekly' | 'monthly' | 'all';
type TrendPeriod = 'daily' | 'weekly' | 'monthly';

const toISODate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getWeekRange = (weekStartISO: string): { start: Date; end: Date } => {
  const start = new Date(weekStartISO + 'T00:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
};

const getMonthRange = (year: number, month: number): { start: Date; end: Date } => {
  const start = new Date(year, month, 1, 0, 0, 0, 0);
  const end = new Date(year, month + 1, 1, 0, 0, 0, 0);
  return { start, end };
};

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function SalesHistory() {
  const { profile } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSale, setExpandedSale] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('daily');
  const [statusModal, setStatusModal] = useState<{ saleId: string; currentStatus: string } | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [rangeLabel, setRangeLabel] = useState('');

  // Trend chart state
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>('daily');
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);

  // Date pickers
  const today = new Date();
  const [weekStart, setWeekStart] = useState(toISODate(today));
  const [monthValue, setMonthValue] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);

  useEffect(() => {
    if (profile?.id) {
      loadSales();
    }
  }, [period, weekStart, monthValue, profile?.id]);

  useEffect(() => {
    if (profile?.id) {
      loadTrend();
    }
  }, [trendPeriod, profile?.id]);

  const loadSales = async () => {
    if (!profile?.id) return;

    setLoading(true);
    try {
      let start: Date;
      let end: Date | null = null;
      let label = '';

      switch (period) {
        case 'daily': {
          const now = new Date();
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          label = `Today (${start.toLocaleDateString()})`;
          break;
        }
        case 'weekly': {
          const range = getWeekRange(weekStart);
          start = range.start;
          end = range.end;
          label = `Week of ${start.toLocaleDateString()} - ${new Date(end.getTime() - 1).toLocaleDateString()}`;
          break;
        }
        case 'monthly': {
          const [y, m] = monthValue.split('-').map(Number);
          const range = getMonthRange(y, m - 1);
          start = range.start;
          end = range.end;
          label = `${monthNames[m - 1]} ${y}`;
          break;
        }
        case 'all': {
          start = new Date(2020, 0, 1);
          label = 'All Time';
          break;
        }
      }

      setRangeLabel(label);

      let query = supabase
        .from('sales')
        .select('*, sale_items(id, quantity, unit_price, subtotal, products(name))')
        .eq('branch_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(500);

      if (period !== 'all') {
        query = query.gte('created_at', start.toISOString());
        if (end) {
          query = query.lt('created_at', end.toISOString());
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setSales(data || []);
    } catch (err) {
      console.error('Error loading sales:', err);
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTrend = async () => {
    if (!profile?.id) return;

    setTrendLoading(true);

    const now = new Date();
    let buckets: { start: Date; end: Date; label: string }[] = [];

    if (trendPeriod === 'daily') {
      // Last 30 days
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const e = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
        buckets.push({ start: d, end: e, label: `${d.getMonth() + 1}/${d.getDate()}` });
      }
    } else if (trendPeriod === 'weekly') {
      // Last 12 weeks
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7);
        d.setDate(d.getDate() - d.getDay()); // snap to Sunday
        const e = new Date(d);
        e.setDate(e.getDate() + 7);
        buckets.push({ start: d, end: e, label: `${d.getMonth() + 1}/${d.getDate()}` });
      }
    } else {
      // Last 12 months
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const e = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        buckets.push({ start: d, end: e, label: `${monthShort[d.getMonth()]} ${String(d.getFullYear()).slice(2)}` });
      }
    }

    const rangeStart = buckets[0].start.toISOString();
    const rangeEnd = buckets[buckets.length - 1].end.toISOString();

    const { data } = await supabase
      .from('sales')
      .select('total, created_at')
      .eq('branch_id', profile.id)
      .gte('created_at', rangeStart)
      .lt('created_at', rangeEnd);

    const points: TrendPoint[] = buckets.map((b) => ({ label: b.label, value: 0 }));

    if (data) {
      (data as { total: number; created_at: string }[]).forEach((sale) => {
        const saleDate = new Date(sale.created_at);
        for (let i = 0; i < buckets.length; i++) {
          if (saleDate >= buckets[i].start && saleDate < buckets[i].end) {
            points[i].value += Number(sale.total);
            break;
          }
        }
      });
    }

    setTrendData(points);
    setTrendLoading(false);
  };

  const handleStatusUpdate = async (saleId: string, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const updateData: Record<string, unknown> = { payment_status: newStatus };
      if (newStatus === 'received') {
        updateData.received_at = new Date().toISOString();
      } else if (newStatus === 'assigned') {
        updateData.assigned_at = new Date().toISOString();
        updateData.received_at = null;
      } else if (newStatus === 'cancelled') {
        updateData.received_at = null;
      }

      const { error } = await supabase.from('sales').update(updateData).eq('id', saleId);
      if (error) throw error;

      setStatusModal(null);
      loadSales();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update status';
      alert(message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const totalRevenue = sales
    .filter((s) => s.payment_status === 'received' || !s.payment_status)
    .reduce((sum, s) => sum + Number(s.total), 0);
  const totalTransactions = sales.length;
  const totalAssigned = sales
    .filter((s) => s.payment_status === 'assigned')
    .reduce((sum, s) => sum + Number(s.total), 0);

  const statusColor = (status?: string) => {
    switch (status) {
      case 'assigned': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'received': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'cancelled': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  const statusIcon = (status?: string) => {
    switch (status) {
      case 'assigned': return <AlertCircle className="w-3 h-3" />;
      case 'received': return <Check className="w-3 h-3" />;
      case 'cancelled': return <X className="w-3 h-3" />;
      default: return <Check className="w-3 h-3" />;
    }
  };

  // Trend chart calculations
  const trendMax = Math.max(...trendData.map((p) => p.value), 1);
  const trendTotal = trendData.reduce((s, p) => s + p.value, 0);
  const firstHalf = trendData.slice(0, Math.floor(trendData.length / 2)).reduce((s, p) => s + p.value, 0);
  const secondHalf = trendData.slice(Math.floor(trendData.length / 2)).reduce((s, p) => s + p.value, 0);
  const trendChange = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;

  // SVG chart dimensions
  const chartW = 800;
  const chartH = 240;
  const padL = 50;
  const padR = 20;
  const padT = 20;
  const padB = 30;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  const xStep = trendData.length > 1 ? plotW / (trendData.length - 1) : 0;
  const yScale = (v: number) => padT + plotH - (v / trendMax) * plotH;
  const xPos = (i: number) => padL + i * xStep;

  const linePath = trendData.length > 0
    ? trendData.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i)} ${yScale(p.value)}`).join(' ')
    : '';
  const areaPath = trendData.length > 0
    ? `${linePath} L ${xPos(trendData.length - 1)} ${padT + plotH} L ${xPos(0)} ${padT + plotH} Z`
    : '';

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    value: trendMax * f,
    y: yScale(trendMax * f),
  }));

  // X-axis labels (show every Nth to avoid crowding)
  const labelEvery = trendData.length > 10 ? Math.ceil(trendData.length / 8) : 1;

  if (loading && sales.length === 0) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Sales History</h1>

      {/* Income Growth Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Income Growth</h2>
            <p className="text-sm text-slate-500 mt-0.5">Your revenue trend over time</p>
          </div>
          <div className="flex items-center gap-3">
            {trendTotal > 0 && (
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold ${
                trendChange > 0 ? 'bg-emerald-50 text-emerald-700' : trendChange < 0 ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-600'
              }`}>
                {trendChange > 0 ? <TrendingUp className="w-4 h-4" /> : trendChange < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                {trendChange > 0 ? '+' : ''}{trendChange.toFixed(1)}%
              </div>
            )}
            <div className="flex gap-1.5">
              {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setTrendPeriod(p)}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                    trendPeriod === p ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {trendLoading ? (
          <div className="flex items-center justify-center h-60"><div className="animate-spin w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full" /></div>
        ) : trendData.every((p) => p.value === 0) ? (
          <div className="flex items-center justify-center h-60 text-slate-400 text-sm">No sales data for this period</div>
        ) : (
          <div className="w-full overflow-x-auto">
            <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full min-w-[600px]" style={{ height: 'auto' }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Y-axis grid lines and labels */}
              {yTicks.map((t, i) => (
                <g key={i}>
                  <line x1={padL} y1={t.y} x2={chartW - padR} y2={t.y} stroke="#f1f5f9" strokeWidth={1} />
                  <text x={padL - 8} y={t.y + 4} textAnchor="end" className="fill-slate-400" style={{ fontSize: 11 }}>
                    ${t.value >= 1000 ? `${(t.value / 1000).toFixed(1)}k` : t.value.toFixed(0)}
                  </text>
                </g>
              ))}

              {/* Area fill */}
              <path d={areaPath} fill="url(#areaGrad)" />

              {/* Line */}
              <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

              {/* Data points */}
              {trendData.map((p, i) => (
                <g key={i}>
                  <circle cx={xPos(i)} cy={yScale(p.value)} r={3.5} fill="#fff" stroke="#3b82f6" strokeWidth={2} />
                  {p.value > 0 && (
                    <title>{`${p.label}: $${p.value.toFixed(2)}`}</title>
                  )}
                </g>
              ))}

              {/* X-axis labels */}
              {trendData.map((p, i) =>
                i % labelEvery === 0 || i === trendData.length - 1 ? (
                  <text key={i} x={xPos(i)} y={chartH - 8} textAnchor="middle" className="fill-slate-400" style={{ fontSize: 11 }}>
                    {p.label}
                  </text>
                ) : null
              )}
            </svg>
          </div>
        )}

        {trendTotal > 0 && (
          <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t border-slate-100">
            <div>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Period Total</span>
              <p className="text-lg font-bold text-slate-900 mt-0.5">${trendTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Average</span>
              <p className="text-lg font-bold text-slate-900 mt-0.5">${(trendTotal / trendData.length).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Best {trendPeriod === 'daily' ? 'Day' : trendPeriod === 'weekly' ? 'Week' : 'Month'}</span>
              <p className="text-lg font-bold text-slate-900 mt-0.5">
                ${Math.max(...trendData.map((p) => p.value)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-2">
          {(['daily', 'weekly', 'monthly', 'all'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors capitalize ${
                period === p ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {p === 'all' ? <Receipt className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
              {p === 'all' ? 'All' : p}
            </button>
          ))}
        </div>

        {period === 'weekly' && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600">Week starting:</label>
            <input
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              className="border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {period === 'monthly' && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600">Month:</label>
            <input
              type="month"
              value={monthValue}
              onChange={(e) => setMonthValue(e.target.value)}
              className="border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}
      </div>

      <p className="text-sm text-slate-500 mb-4">
        Showing data for: <span className="font-semibold text-slate-700">{rangeLabel}</span>
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">Revenue (Received)</span>
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">Pending (Assigned)</span>
            <AlertCircle className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">${totalAssigned.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">All Transactions</span>
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
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-50">
                  <Receipt className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-900">Sale #{sale.id.substring(0, 8)}</p>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold border ${statusColor(sale.payment_status)}`}>
                      {statusIcon(sale.payment_status)}
                      {(sale.payment_status || 'received').charAt(0).toUpperCase() + (sale.payment_status || 'received').slice(1)}
                    </span>
                    {sale.payment_method && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-slate-500 bg-slate-100 rounded">
                        {sale.payment_method === 'cash' ? <DollarSign className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                        {sale.payment_method.charAt(0).toUpperCase() + sale.payment_method.slice(1)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{new Date(sale.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-slate-900">${Number(sale.total).toFixed(2)}</p>
                  {(sale.payment_status === 'assigned' || sale.payment_status === 'cancelled') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setStatusModal({ saleId: sale.id, currentStatus: sale.payment_status || 'received' });
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium mt-1"
                    >
                      Manage Status
                    </button>
                  )}
                </div>
                <svg className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ${expandedSale === sale.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
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

      {/* Status Update Modal */}
      {statusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Update Payment Status</h3>
              <button onClick={() => setStatusModal(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <button
                onClick={() => handleStatusUpdate(statusModal.saleId, 'received')}
                disabled={updatingStatus}
                className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-emerald-200 hover:bg-emerald-50 transition-colors disabled:opacity-50"
              >
                <Check className="w-5 h-5 text-emerald-600" />
                <div className="text-left">
                  <p className="font-semibold text-emerald-700">Mark as Received Payment</p>
                  <p className="text-xs text-emerald-600">Transaction will be added to total revenue</p>
                </div>
                {updatingStatus && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
              </button>
              <button
                onClick={() => handleStatusUpdate(statusModal.saleId, 'cancelled')}
                disabled={updatingStatus}
                className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5 text-red-600" />
                <div className="text-left">
                  <p className="font-semibold text-red-700">Cancel Transaction</p>
                  <p className="text-xs text-red-600">Items will be returned to inventory</p>
                </div>
              </button>
              <button
                onClick={() => setStatusModal(null)}
                className="w-full py-2.5 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
