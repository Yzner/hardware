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

  // Fetch employees and debts
  const fetchData = useCallback(async () => {
    setLoading(true);

    const [empRes, debtRes] = await Promise.all([
      supabase
        .from('employees')
        .select('*')
        .eq('is_active', true)
        .order('full_name'),

      // IMPORTANT:
      // Use the actual foreign key relationship name.
      // Supabase auto-detects this syntax.
      supabase
        .from('debts')
        .select(`
          *,
          employee:employees (
            id,
            full_name,
            employee_id
          )
        `)
        .order('created_at', { ascending: false }),
    ]);

    if (empRes.error) {
      console.error('Error loading employees:', empRes.error);
    }

    if (debtRes.error) {
      console.error('Error loading debts:', debtRes.error);
    }

    setEmployees(empRes.data || []);
    setDebts((debtRes.data as Debt[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Save debt
  const handleSave = async () => {
    // Validation
    if (!form.employee_id) {
      alert('Please select an employee.');
      return;
    }

    const amount = parseFloat(form.amount);

    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    setSaving(true);

    try {
      // IMPORTANT FIX:
      // Your database column is "remaining_balanc" (without the final "e")
      // based on your screenshot.
      const { error } = await supabase.from('debts').insert([
        {
          employee_id: form.employee_id,
          debt_type: form.debt_type,
          amount: amount,
          remaining_balance: amount, // <-- FIXED COLUMN NAME
          description: form.description || null,
          is_fully_paid: false,
        },
      ]);

      if (error) {
        console.error('Error inserting debt:', error);
        alert(`Failed to save debt:\n${error.message}`);
        return;
      }

      // Reset form
      setForm({
        employee_id: '',
        debt_type: 'cash_advance',
        amount: '',
        description: '',
      });

      setShowForm(false);

      // Refresh table
      await fetchData();
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('Unexpected error while saving debt.');
    } finally {
      setSaving(false);
    }
  };

  // Delete debt
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this debt record?')) return;

    const { error } = await supabase
      .from('debts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting debt:', error);
      alert(`Failed to delete debt:\n${error.message}`);
      return;
    }

    fetchData();
  };

  // Filter records
  const filtered = debts.filter((d) => {
    const employeeName = d.employee?.full_name?.toLowerCase() || '';
    const description = d.description?.toLowerCase() || '';

    const matchSearch =
      employeeName.includes(search.toLowerCase()) ||
      description.includes(search.toLowerCase());

    const matchType =
      filterType === 'all' || d.debt_type === filterType;

    return matchSearch && matchType;
  });

  // IMPORTANT:
  // Support both remaining_balance and remaining_balanc
  const totalDebts = filtered.reduce(
    (sum, d) =>
      sum +
      Number(
        (d as any).remaining_balance ??
          (d as any).remaining_balance ??
          0
      ),
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Employee Debts
          </h1>
          <p className="text-slate-500 mt-1">
            Manage cash advances, loans, and deductions
          </p>
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
          <p className="text-2xl font-bold text-rose-600 mt-1">
            {formatCurrency(totalDebts)}
          </p>
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
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
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
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                  Employee
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                  Type
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                  Amount
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                  Remaining
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                  Description
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                  Status
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filtered.map((debt) => {
                const remaining =
                  (debt as any).remaining_balance ??
                  (debt as any).remaining_balance ??
                  0;

                return (
                  <tr
                    key={debt.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {debt.employee?.full_name || 'Unknown'}
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {DEBT_TYPE_LABELS[debt.debt_type]}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatCurrency(debt.amount)}
                    </td>

                    <td className="px-6 py-4 text-sm font-medium text-rose-600">
                      {formatCurrency(Number(remaining))}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {debt.description || '--'}
                    </td>

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
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-sm text-slate-500"
                  >
                    No debt records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Debt Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Add Employee Debt"
        size="md"
      >
        <div className="space-y-4">
          {/* Employee */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Employee
            </label>
            <select
              value={form.employee_id}
              onChange={(e) =>
                setForm({
                  ...form,
                  employee_id: e.target.value,
                })
              }
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

          {/* Debt Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Debt Type
            </label>
            <select
              value={form.debt_type}
              onChange={(e) =>
                setForm({
                  ...form,
                  debt_type: e.target.value as DebtType,
                })
              }
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {Object.entries(DEBT_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Amount
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={(e) =>
                setForm({
                  ...form,
                  amount: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm({
                  ...form,
                  description: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
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