import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { Employee, Payroll } from '../../lib/types';
import { formatCurrency, formatDate } from '../../lib/utils';
import Modal from '../../contexts/Modal';
import { Plus, Search, CheckCircle } from 'lucide-react';

export default function Payroll() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    employee_id: '',
    period_start: '',
    period_end: '',
  });

  const fetchData = useCallback(async () => {
    const [empRes, payRes] = await Promise.all([
      supabase.from('employees').select('*').eq('is_active', true).order('full_name'),
      supabase.from('payroll').select('*, employee:employees(*)').order('created_at', { ascending: false }),
    ]);
    setEmployees(empRes.data || []);
    setPayrolls(payRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const computePayroll = async () => {
    setSaving(true);
    const emp = employees.find((e) => e.id === form.employee_id);
    if (!emp) {
      setSaving(false);
      return;
    }

    // Count days worked in the period
    const { data: attendanceRecords } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', form.employee_id)
      .gte('date', form.period_start)
      .lte('date', form.period_end);

    const daysWorked = (attendanceRecords || []).filter((a) => a.time_in).length;
    const grossSalary = daysWorked * Number(emp.salary_rate);

    // Get unpaid debts for this employee
    const { data: empDebts } = await supabase
      .from('debts')
      .select('*')
      .eq('employee_id', form.employee_id)
      .eq('is_fully_paid', false);

    const totalDebts = (empDebts || []).reduce((sum, d) => sum + Number(d.remaining_balance), 0);
    const totalDeductions = Math.min(totalDebts, grossSalary);
    const netSalary = grossSalary - totalDeductions;

    await supabase.from('payroll').insert({
      employee_id: form.employee_id,
      period_start: form.period_start,
      period_end: form.period_end,
      days_worked: daysWorked,
      gross_salary: grossSalary,
      total_debts: totalDebts,
      total_deductions: totalDeductions,
      net_salary: netSalary,
      status: 'pending',
    });

    // Update debt remaining balances (deduct from debts)
    if (empDebts && empDebts.length > 0 && totalDeductions > 0) {
      let remainingDeduction = totalDeductions;
      for (const debt of empDebts) {
        if (remainingDeduction <= 0) break;
        const deduct = Math.min(Number(debt.remaining_balance), remainingDeduction);
        const newBalance = Number(debt.remaining_balance) - deduct;
        remainingDeduction -= deduct;
        await supabase
          .from('debts')
          .update({
            remaining_balance: newBalance,
            is_fully_paid: newBalance <= 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', debt.id);
      }
    }

    setShowForm(false);
    setForm({ employee_id: '', period_start: '', period_end: '' });
    setSaving(false);
    fetchData();
  };

  const markAsPaid = async (id: string) => {
    try {
      setSaving(true);

      // Get payroll record to know which employee this payroll belongs to
      const { data: payrollRecord, error: payrollFetchError } = await supabase
        .from('payroll')
        .select('id, employee_id')
        .eq('id', id)
        .single();

      if (payrollFetchError) {
        throw payrollFetchError;
      }

      if (!payrollRecord) {
        throw new Error('Payroll record not found.');
      }

      // 1. Update payroll status to paid
      const { error: payrollUpdateError } = await supabase
        .from('payroll')
        .update({
          status: 'paid',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (payrollUpdateError) {
        throw payrollUpdateError;
      }

      // 2. Delete fully paid debts for this employee
      // A debt is considered fully paid when remaining_balance <= 0
      const { error: deleteDebtError } = await supabase
        .from('debts')
        .delete()
        .eq('employee_id', payrollRecord.employee_id)
        .lte('remaining_balance', 0);

      if (deleteDebtError) {
        throw deleteDebtError;
      }

      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Error marking payroll as paid:', error);
      alert(
        `Failed to mark payroll as paid: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    } finally {
      setSaving(false);
    }
  };

  const filtered = payrolls.filter(
    (p) =>
      p.employee?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.status.includes(search.toLowerCase())
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payroll</h1>
          <p className="text-slate-500 mt-1">Process and manage employee salaries</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
        >
          <Plus size={18} />
          Generate Payroll
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Total Payroll</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {formatCurrency(payrolls.reduce((s, p) => s + Number(p.net_salary), 0))}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Pending</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {payrolls.filter((p) => p.status === 'pending').length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Paid</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {payrolls.filter((p) => p.status === 'paid').length}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search payroll records..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Period</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Days</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Deductions</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Salary</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((pr) => (
                <tr key={pr.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">
                    {pr.employee?.full_name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {formatDate(pr.period_start)} - {formatDate(pr.period_end)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{pr.days_worked}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{formatCurrency(pr.gross_salary)}</td>
                  <td className="px-6 py-4 text-sm text-rose-600">{formatCurrency(pr.total_deductions)}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                    {formatCurrency(pr.net_salary)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        pr.status === 'paid'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {pr.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {pr.status === 'pending' && (
                      <button
                        onClick={() => markAsPaid(pr.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors"
                      >
                        <CheckCircle size={14} />
                        Mark Paid
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-500">
                    No payroll records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Payroll Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Generate Payroll" size="md">
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
                  {emp.full_name} ({emp.employee_id}) - {formatCurrency(emp.salary_rate)}/day
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Period Start</label>
              <input
                type="date"
                value={form.period_start}
                onChange={(e) => setForm({ ...form, period_start: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Period End</label>
              <input
                type="date"
                value={form.period_end}
                onChange={(e) => setForm({ ...form, period_end: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600">
            <p>Payroll will be computed based on:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Days worked (attendance records in the period)</li>
              <li>Employee's daily salary rate</li>
              <li>Outstanding debt deductions</li>
            </ul>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={computePayroll}
              disabled={saving || !form.employee_id || !form.period_start || !form.period_end}
              className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? 'Computing...' : 'Generate Payroll'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
