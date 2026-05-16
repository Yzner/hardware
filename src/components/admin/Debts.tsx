import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { Employee, Debt, DebtType } from '../../lib/types';
import { DEBT_TYPE_LABELS } from '../../lib/types';
import { formatCurrency } from '../../lib/utils';
import Modal from '../../contexts/Modal';
import { Plus, Search, Trash2 } from 'lucide-react';

export default function Debts() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');

  const [form, setForm] = useState({
    employee_id: '',
    debt_type: 'cash_advance' as DebtType,
    amount: '',
    description: '',
  });

  const fetchData = useCallback(async () => {
    const [empRes, debtRes] = await Promise.all([
      supabase.from('employees').select('*').eq('is_active', true).order('full_name'),
      supabase.from('debts').select('*, employee:employees(*)').order('created_at', { ascending: false }),
    ]);
    setEmployees(empRes.data || []);
    setDebts(debtRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    const amount = parseFloat(form.amount) || 0;
    await supabase.from('debts').insert({
      employee_id: form.employee_id,
      debt_type: form.debt_type,
      amount,
      remaining_balance: amount,
      description: form.description,
    });
    setShowForm(false);
    setForm({ employee_id: '', debt_type: 'cash_advance', amount: '', description: '' });
    setSaving(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this debt record?')) return;
    await supabase.from('debts').delete().eq('id', id);
    fetchData();
  };

  const filtered = debts.filter((d) => {
    const matchSearch =
      d.employee?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.description.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || d.debt_type === filterType;
    return matchSearch && matchType;
  });

  const totalDebts = filtered.reduce((sum, d) => sum + Number(d.remaining_balance), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Employee Debts</h1>
          <p className="text-slate-500 mt-1">Manage cash advances, loans, and deductions</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
        >
          <Plus size={18} />
          Add Debt
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Total Outstanding</p>
          <p className="text-2xl font-bold text-rose-600 mt-1">{formatCurrency(totalDebts)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Active Debts</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {debts.filter((d) => !d.is_fully_paid).length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Fully Paid</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {debts.filter((d) => d.is_fully_paid).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search debts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All Types</option>
          {Object.entries(DEBT_TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Remaining</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((debt) => (
                <tr key={debt.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">
                    {debt.employee?.full_name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        debt.debt_type === 'cash_advance'
                          ? 'bg-blue-50 text-blue-700'
                          : debt.debt_type === 'salary_loan'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {DEBT_TYPE_LABELS[debt.debt_type]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{formatCurrency(debt.amount)}</td>
                  <td className="px-6 py-4 text-sm font-medium text-rose-600">
                    {formatCurrency(debt.remaining_balance)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{debt.description || '--'}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        debt.is_fully_paid
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {debt.is_fully_paid ? 'Paid' : 'Unpaid'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(debt.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500">
                    No debt records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Debt Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Add Employee Debt" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Employee</label>
            <select
              value={form.employee_id}
              onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">-- Select Employee --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} ({emp.employee_id})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Debt Type</label>
            <select
              value={form.debt_type}
              onChange={(e) => setForm({ ...form, debt_type: e.target.value as DebtType })}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {Object.entries(DEBT_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.employee_id || !form.amount}
              className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Add Debt'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
