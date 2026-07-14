import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, TrendingUp, TrendingDown, Minus, DollarSign, PiggyBank, List } from 'lucide-react';

interface SaleRow {
  id: string;
  branch_id: string;
  total: number;
  created_at: string;
  payment_status?: string;
  branch: { branch_name: string } | null;
  sale_items: { unit_cost_price: number; unit_price: number; quantity: number; products: { cost_price: number } | null }[];
}

interface BranchReport {
  branch_name: string;
  branch_id: string;
  total: number;
  cost: number;
  profit: number;
  count: number;
}

interface TrendPoint {
  label: string;
  value: number;
}

type Period = 'all' | 'daily' | 'weekly' | 'monthly';
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

export default function IncomeReports() {
  const [period, setPeriod] = useState<Period>('daily');
  const [reports, setReports] = useState<BranchReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [grandTotal, setGrandTotal] = useState(0);
  const [grandCost, setGrandCost] = useState(0);
  const [grandProfit, setGrandProfit] = useState(0);
  const [rangeLabel, setRangeLabel] = useState('');

  // All transactions
  const [allTransactions, setAllTransactions] = useState<SaleRow[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  // Trend chart state
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>('daily');
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);

  // Date pickers
  const today = new Date();
  const [weekStart, setWeekStart] = useState(toISODate(today));
  const [monthValue, setMonthValue] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);

  useEffect(() => {
    loadReports();
  }, [period, weekStart, monthValue]);

  useEffect(() => {
    loadTrend();
  }, [trendPeriod]);

  const loadReports = async () => {
    setLoading(true);
    setTransactionsLoading(true);

    // For "all" period, we load all transactions
    if (period === 'all') {
      setRangeLabel('All Time');

      const { data } = await supabase
        .from('sales')
        .select('*, branch:profiles!sales_branch_id_fkey(branch_name), sale_items(unit_cost_price, unit_price, quantity, products(cost_price))')
        .order('created_at', { ascending: false });

      if (data) {
        setAllTransactions(data as SaleRow[]);

        const branchMap: Record<string, BranchReport> = {};
        let totalRevenue = 0;
        let totalCost = 0;

        (data as SaleRow[]).forEach((sale) => {
          const name = sale.branch?.branch_name || 'Unknown';
          if (!branchMap[sale.branch_id]) {
            branchMap[sale.branch_id] = { branch_name: name, branch_id: sale.branch_id, total: 0, cost: 0, profit: 0, count: 0 };
          }

          let saleCost = 0;
          let saleRevenue = 0;
          if (sale.sale_items && sale.sale_items.length > 0) {
            sale.sale_items.forEach(item => {
              const costPrice = Number(item.unit_cost_price) > 0
                ? Number(item.unit_cost_price)
                : Number(item.products?.cost_price || 0);
              saleCost += costPrice * item.quantity;
              saleRevenue += Number(item.unit_price) * item.quantity;
            });
          } else {
            saleRevenue = Number(sale.total);
          }

          branchMap[sale.branch_id].total += saleRevenue;
          branchMap[sale.branch_id].cost += saleCost;
          branchMap[sale.branch_id].profit += saleRevenue - saleCost;
          branchMap[sale.branch_id].count += 1;
          totalRevenue += saleRevenue;
          totalCost += saleCost;
        });

        setReports(Object.values(branchMap).sort((a, b) => b.total - a.total));
        setGrandTotal(totalRevenue);
        setGrandCost(totalCost);
        setGrandProfit(totalRevenue - totalCost);
      } else {
        setAllTransactions([]);
        setReports([]);
        setGrandTotal(0);
        setGrandCost(0);
        setGrandProfit(0);
      }
      setLoading(false);
      setTransactionsLoading(false);
      return;
    }

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
    }

    setRangeLabel(label);

    let query = supabase
      .from('sales')
      .select('*, branch:profiles!sales_branch_id_fkey(branch_name), sale_items(unit_cost_price, unit_price, quantity, products(cost_price))')
      .gte('created_at', start.toISOString())
      .order('created_at', { ascending: false });

    if (end) {
      query = query.lt('created_at', end.toISOString());
    }

    const { data } = await query;

    if (data) {
      setAllTransactions(data as SaleRow[]);

      const branchMap: Record<string, BranchReport> = {};
      let totalRevenue = 0;
      let totalCost = 0;

      (data as SaleRow[]).forEach((sale) => {
        const name = sale.branch?.branch_name || 'Unknown';
        if (!branchMap[sale.branch_id]) {
          branchMap[sale.branch_id] = { branch_name: name, branch_id: sale.branch_id, total: 0, cost: 0, profit: 0, count: 0 };
        }

        // Calculate cost and revenue from sale items
        let saleCost = 0;
        let saleRevenue = 0;
        if (sale.sale_items && sale.sale_items.length > 0) {
          sale.sale_items.forEach(item => {
            const costPrice = Number(item.unit_cost_price) > 0
              ? Number(item.unit_cost_price)
              : Number(item.products?.cost_price || 0);
            saleCost += costPrice * item.quantity;
            saleRevenue += Number(item.unit_price) * item.quantity;
          });
        } else {
          // Fallback if no sale_items
          saleRevenue = Number(sale.total);
        }

        branchMap[sale.branch_id].total += saleRevenue;
        branchMap[sale.branch_id].cost += saleCost;
        branchMap[sale.branch_id].profit += saleRevenue - saleCost;
        branchMap[sale.branch_id].count += 1;
        totalRevenue += saleRevenue;
        totalCost += saleCost;
      });

      setReports(Object.values(branchMap).sort((a, b) => b.total - a.total));
      setGrandTotal(totalRevenue);
      setGrandCost(totalCost);
      setGrandProfit(totalRevenue - totalCost);
    } else {
      setAllTransactions([]);
      setReports([]);
      setGrandTotal(0);
      setGrandCost(0);
      setGrandProfit(0);
    }
    setLoading(false);
    setTransactionsLoading(false);
  };

  const loadTrend = async () => {
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

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Income Reports</h1>

      {/* Income Growth Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Income Growth</h2>
            <p className="text-sm text-slate-500 mt-0.5">Revenue trend over time</p>
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
                    trendPeriod === p ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {trendLoading ? (
          <div className="flex items-center justify-center h-60"><div className="animate-spin w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full" /></div>
        ) : trendData.every((p) => p.value === 0) ? (
          <div className="flex items-center justify-center h-60 text-slate-400 text-sm">No sales data for this period</div>
        ) : (
          <div className="w-full overflow-x-auto">
            <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full min-w-[600px]" style={{ height: 'auto' }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
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
              <path d={linePath} fill="none" stroke="#10b981" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

              {/* Data points */}
              {trendData.map((p, i) => (
                <g key={i}>
                  <circle cx={xPos(i)} cy={yScale(p.value)} r={3.5} fill="#fff" stroke="#10b981" strokeWidth={2} />
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

      {/* Period selector for branch breakdown */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-2">
          {(['all', 'daily', 'weekly', 'monthly'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors capitalize ${
                period === p ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {p === 'all' ? <List className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
              {p}
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
              className="border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
              className="border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        )}
      </div>

      <p className="text-sm text-slate-500 mb-4">
        Showing data for: <span className="font-semibold text-slate-700">{rangeLabel}</span>
      </p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">Total Revenue</span>
            <DollarSign className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">Total Cost</span>
            <TrendingDown className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">${grandCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">Total Profit</span>
            <PiggyBank className="w-5 h-5 text-blue-500" />
          </div>
          <p className={`text-3xl font-bold ${grandProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            ${grandProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          {grandTotal > 0 && (
            <p className="text-xs text-slate-500 mt-1">
              {((grandProfit / grandTotal) * 100).toFixed(1)}% margin
            </p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <span className="text-sm font-medium text-slate-500">Total Transactions</span>
          <p className="text-3xl font-bold text-slate-900 mt-2">{reports.reduce((s, r) => s + r.count, 0)}</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-slate-500">Active Branches</span>
          <p className="text-2xl font-bold text-slate-900">{reports.length}</p>
        </div>
        <div className="text-right">
          <span className="text-sm font-medium text-slate-500">Profit Margin</span>
          <p className={`text-2xl font-bold ${grandProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {grandTotal > 0 ? ((grandProfit / grandTotal) * 100).toFixed(1) : 0}%
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Branch</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Transactions</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Revenue</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cost</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Profit</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.branch_id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-slate-900">{r.branch_name}</td>
                <td className="px-6 py-4 text-sm text-slate-600 text-right">{r.count}</td>
                <td className="px-6 py-4 text-sm font-semibold text-slate-900 text-right">${r.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="px-6 py-4 text-sm text-red-600 text-right">${r.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className={`px-6 py-4 text-sm font-semibold text-right ${r.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  ${r.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            {reports.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">No sales data for this period</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* All Transactions Table */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">All Transactions ({allTransactions.length})</h2>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Branch</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sale ID</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Revenue</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cost</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Profit</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactionsLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center">
                      <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto" />
                    </td>
                  </tr>
                ) : allTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">No transactions found</td>
                  </tr>
                ) : (
                  allTransactions.map((tx) => {
                    let saleCost = 0;
                    let saleRevenue = 0;
                    if (tx.sale_items && tx.sale_items.length > 0) {
                      tx.sale_items.forEach(item => {
                        const costPrice = Number(item.unit_cost_price) > 0
                          ? Number(item.unit_cost_price)
                          : Number(item.products?.cost_price || 0);
                        saleCost += costPrice * item.quantity;
                        saleRevenue += Number(item.unit_price) * item.quantity;
                      });
                    } else {
                      saleRevenue = Number(tx.total);
                    }
                    const profit = saleRevenue - saleCost;

                    return (
                      <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {new Date(tx.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">
                          {tx.branch?.branch_name || 'Unknown'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 font-mono">
                          {tx.id.substring(0, 8)}...
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900 text-right">
                          ${saleRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-sm text-red-600 text-right">
                          ${saleCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className={`px-4 py-3 text-sm font-semibold text-right ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          ${profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            tx.payment_status === 'assigned' ? 'bg-amber-100 text-amber-700' :
                            tx.payment_status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-emerald-100 text-emerald-700'
                          }`}>
                            {tx.payment_status || 'received'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
