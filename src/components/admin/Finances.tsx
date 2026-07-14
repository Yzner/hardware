import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Plus, Pencil, Trash2, X, AlertCircle, CheckCircle, Search,
  DollarSign, TrendingDown, Calendar, Tag, ChevronDown, ChevronUp,
  Wallet, Filter
} from 'lucide-react';

interface Branch {
  id: string;
  branch_name: string;
}

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  branch_id: string | null;
  created_at: string;
  branch?: { branch_name: string } | null;
}

interface ExpenseForm {
  category: string;
  description: string;
  amount: string;
  expense_date: string;
  branch_id: string;
}

const CATEGORIES = [
  'Salary',
  'Electricity',
  'WiFi / Internet',
  'Water',
  'Repair & Maintenance',
  'Supplies',
  'Rent',
  'Transportation',
  'Marketing',
  'Other',
];

const CATEGORY_COLORS: Record<string, string> = {
  'Salary': 'bg-blue-100 text-blue-700',
  'Electricity': 'bg-yellow-100 text-yellow-700',
  'WiFi / Internet': 'bg-cyan-100 text-cyan-700',
  'Water': 'bg-sky-100 text-sky-700',
  'Repair & Maintenance': 'bg-orange-100 text-orange-700',
  'Supplies': 'bg-purple-100 text-purple-700',
  'Rent': 'bg-rose-100 text-rose-700',
  'Transportation': 'bg-teal-100 text-teal-700',
  'Marketing': 'bg-pink-100 text-pink-700',
  'Other': 'bg-slate-100 text-slate-700',
};

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const toISO = (d: Date) => d.toISOString().slice(0, 10);

const fmtDate = (iso: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return new Date(Number(y), Number(m) - 1, Number(d))
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const EMPTY_FORM: ExpenseForm = {
  category: CATEGORIES[0],
  description: '',
  amount: '',
  expense_date: toISO(new Date()),
  branch_id: '',
};

export default function Finances() {
  const { user } = useAuth();
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState(toISO(firstOfMonth));
  const [dateTo, setDateTo] = useState(toISO(today));
  const [filterCategory, setFilterCategory] = useState('');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<keyof Expense>('expense_date');
  const [sortAsc, setSortAsc] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Expense | null>(null);
  const [form, setForm] = useState<ExpenseForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [expRes, branchRes] = await Promise.all([
      supabase
        .from('expenses')
        .select('*, branch:profiles!expenses_branch_id_fkey(branch_name)')
        .gte('expense_date', dateFrom)
        .lte('expense_date', dateTo)
        .order('expense_date', { ascending: false }),
      supabase
        .from('profiles')
        .select('id, branch_name')
        .eq('role', 'branch')
        .order('branch_name'),
    ]);

    if (expRes.error) setError(expRes.error.message);
    else setExpenses(expRes.data as Expense[]);

    if (!branchRes.error && branchRes.data) setBranches(branchRes.data as Branch[]);
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormSuccess(false);
    setShowModal(true);
  };

  const openEdit = (exp: Expense) => {
    setEditTarget(exp);
    setForm({
      category: exp.category,
      description: exp.description,
      amount: String(exp.amount),
      expense_date: exp.expense_date,
      branch_id: exp.branch_id || '',
    });
    setFormError(null);
    setFormSuccess(false);
    setShowModal(true);
  };

  const handleSave = async () => {
    const amt = parseFloat(form.amount);
    if (!form.category) { setFormError('Please select a category.'); return; }
    if (!amt || amt <= 0) { setFormError('Please enter a valid amount.'); return; }
    if (!form.expense_date) { setFormError('Please enter a date.'); return; }

    setSaving(true); setFormError(null);

    const payload = {
      category: form.category,
      description: form.description.trim(),
      amount: amt,
      expense_date: form.expense_date,
      branch_id: form.branch_id || null,
      recorded_by: user?.id || null,
    };

    let err;
    if (editTarget) {
      ({ error: err } = await supabase.from('expenses').update(payload).eq('id', editTarget.id));
    } else {
      ({ error: err } = await supabase.from('expenses').insert(payload));
    }

    if (err) {
      setFormError(err.message);
      setSaving(false);
      return;
    }

    setFormSuccess(true);
    setSaving(false);
    setTimeout(() => {
      setShowModal(false);
      load();
    }, 800);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.from('expenses').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    load();
  };

  const handleSort = (field: keyof Expense) => {
    if (sortField === field) setSortAsc(a => !a);
    else { setSortField(field); setSortAsc(false); }
  };

  const filtered = expenses
    .filter(e => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        e.category.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        ((e.branch as { branch_name: string } | null)?.branch_name || '').toLowerCase().includes(q);
      const matchCategory = !filterCategory || e.category === filterCategory;
      return matchSearch && matchCategory;
    })
    .sort((a, b) => {
      const av = a[sortField]; const bv = b[sortField];
      if (av == null) return 1; if (bv == null) return -1;
      if (typeof av === 'string' && typeof bv === 'string')
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortAsc ? (Number(av) - Number(bv)) : (Number(bv) - Number(av));
    });

  const totalFiltered = filtered.reduce((s, e) => s + Number(e.amount), 0);
  const totalAll = expenses.reduce((s, e) => s + Number(e.amount), 0);

  // Category breakdown
  const categoryTotals = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
    return acc;
  }, {});
  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const SortIcon = ({ field }: { field: keyof Expense }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 opacity-30 inline ml-1" />;
    return sortAsc
      ? <ChevronUp className="w-3 h-3 text-rose-500 inline ml-1" />
      : <ChevronDown className="w-3 h-3 text-rose-500 inline ml-1" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Finances</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track and manage business expenses by category and branch</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Expense
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date From</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-slate-50"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date To</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-slate-50"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                className="pl-9 pr-8 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-slate-50 appearance-none"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text" placeholder="Category, description, branch..." value={search} onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-slate-50 w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-rose-100 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Expenses (Period)</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-rose-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-600">&#8369;{fmt(totalAll)}</p>
          <p className="text-xs text-slate-400 mt-1">{expenses.length} entries</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filtered Total</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-slate-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-700">&#8369;{fmt(totalFiltered)}</p>
          <p className="text-xs text-slate-400 mt-1">{filtered.length} entries shown</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Top Category</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <Tag className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          {topCategories.length > 0 ? (
            <>
              <p className="text-lg font-bold text-slate-800">{topCategories[0][0]}</p>
              <p className="text-xs text-slate-400 mt-1">&#8369;{fmt(topCategories[0][1])}</p>
            </>
          ) : (
            <p className="text-sm text-slate-400">No data</p>
          )}
        </div>
      </div>

      {/* Category Breakdown */}
      {topCategories.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Expense Breakdown</h2>
          <div className="space-y-3">
            {topCategories.map(([cat, total]) => {
              const pct = totalAll > 0 ? (total / totalAll) * 100 : 0;
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full min-w-[120px] ${CATEGORY_COLORS[cat] || 'bg-slate-100 text-slate-700'}`}>{cat}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-slate-700 min-w-[90px] text-right">&#8369;{fmt(total)}</span>
                  <span className="text-xs text-slate-400 min-w-[36px] text-right">{pct.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expenses Table */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Expense Entries</h2>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            {expenses.length === 0 ? 'No expenses recorded for this period.' : 'No entries match your filters.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {([
                    ['expense_date', 'Date'],
                    ['category', 'Category'],
                    ['description', 'Description'],
                    ['branch_id', 'Branch'],
                    ['amount', 'Amount'],
                  ] as [keyof Expense, string][]).map(([field, label]) => (
                    <th
                      key={field}
                      onClick={() => handleSort(field)}
                      className={`px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 select-none ${field === 'amount' ? 'text-right' : 'text-left'}`}
                    >
                      {label}<SortIcon field={field} />
                    </th>
                  ))}
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(exp => (
                  <tr key={exp.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 text-sm text-slate-600 whitespace-nowrap">{fmtDate(exp.expense_date)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[exp.category] || 'bg-slate-100 text-slate-700'}`}>
                        {exp.category}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-700 max-w-[220px] truncate">{exp.description || <span className="text-slate-300">—</span>}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-500">
                      {(exp.branch as { branch_name: string } | null)?.branch_name || <span className="text-slate-300 text-xs">General</span>}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-rose-600 text-right">&#8369;{fmt(Number(exp.amount))}</td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEdit(exp)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(exp)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td colSpan={4} className="px-5 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Total ({filtered.length} entries)
                  </td>
                  <td className="px-5 py-3 text-sm font-bold text-rose-600 text-right">&#8369;{fmt(totalFiltered)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">{editTarget ? 'Edit Expense' : 'Add Expense'}</h2>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Description <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe - June salary"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">&#8369;</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={form.amount}
                      onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                      className="w-full pl-7 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.expense_date}
                    onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Branch <span className="text-slate-400 font-normal">(optional — leave blank for general)</span>
                </label>
                <select
                  value={form.branch_id}
                  onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                >
                  <option value="">General (no branch)</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
                </select>
              </div>

              {formError && (
                <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="flex items-center gap-2 text-emerald-700 text-sm bg-emerald-50 rounded-lg px-3 py-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  {editTarget ? 'Expense updated!' : 'Expense added!'}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || formSuccess}
                className="flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                {saving ? 'Saving...' : editTarget ? 'Update' : 'Add Expense'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">Delete Expense</h3>
            <p className="text-sm text-slate-500 text-center mb-1">
              <span className={`font-semibold px-2 py-0.5 rounded-full text-xs ${CATEGORY_COLORS[deleteTarget.category] || 'bg-slate-100 text-slate-700'}`}>{deleteTarget.category}</span>
            </p>
            <p className="text-sm text-slate-500 text-center mb-5">
              &#8369;{fmt(Number(deleteTarget.amount))} — {fmtDate(deleteTarget.expense_date)}
            </p>
            <p className="text-xs text-slate-400 text-center mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {deleting ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
