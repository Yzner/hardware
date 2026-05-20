import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { Employee, Attendance, Debt, Payroll } from '../../lib/types';
import { DEBT_TYPE_LABELS } from '../../lib/types';
import { formatCurrency, formatDate, formatTime } from '../../lib/utils';
import { FileText, Clock, Banknote, Receipt } from 'lucide-react';

type ReportTab = 'attendance' | 'debts' | 'salary';

export default function Reports() {
  const [activeTab, setActiveTab] = useState<ReportTab>('attendance');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [payroll, setPayroll] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');

  const fetchData = useCallback(async () => {
    const [empRes, attRes, debtRes, payRes] = await Promise.all([
      supabase.from('employees').select('*').order('full_name'),
      supabase.from('attendance').select('*, employee:employees(*)').order('date', { ascending: false }),
      supabase.from('debts').select('*, employee:employees(*)').order('created_at', { ascending: false }),
      supabase.from('payroll').select('*, employee:employees(*)').order('created_at', { ascending: false }),
    ]);
    setEmployees(empRes.data || []);
    setAttendance(attRes.data || []);
    setDebts(debtRes.data || []);
    setPayroll(payRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filterByDate = (date: string) => {
    if (dateFrom && date < dateFrom) return false;
    if (dateTo && date > dateTo) return false;
    return true;
  };

  const filterByEmployee = (empId: string) => {
    if (selectedEmployee && empId !== selectedEmployee) return false;
    return true;
  };

  const filteredAttendance = attendance.filter(
    (a) => filterByDate(a.date) && filterByEmployee(a.employee_id)
  );

  const filteredDebts = debts.filter(
    (d) => filterByEmployee(d.employee_id)
  );

  const filteredPayroll = payroll.filter(
    (p) => filterByEmployee(p.employee_id)
  );

  // Compute per-employee attendance summary
  const employeeAttendanceSummary = employees.map((emp) => {
    const empAtt = attendance.filter((a) => a.employee_id === emp.id && filterByDate(a.date));
    const daysWorked = empAtt.filter((a) => a.time_in).length;
    const totalHours = empAtt.reduce((sum, a) => sum + Number(a.total_hours || 0), 0);
    return { employee: emp, daysWorked, totalHours };
  }).filter((s) => s.daysWorked > 0);

  const tabs: { key: ReportTab; label: string; icon: typeof FileText }[] = [
    { key: 'attendance', label: 'Attendance', icon: Clock },
    { key: 'debts', label: 'Employee Debts', icon: Banknote },
    { key: 'salary', label: 'Salary Records', icon: Receipt },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="text-slate-500 mt-1">View attendance, debts, and salary reports</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Employee</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg max-w-md">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Attendance Report */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Summary by Employee */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Employee Attendance Summary</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Employee</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Days Worked</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Total Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employeeAttendanceSummary.map(({ employee, daysWorked, totalHours }) => (
                    <tr key={employee.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{employee.full_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{daysWorked}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{totalHours.toFixed(1)}</td>
                    </tr>
                  ))}
                  {employeeAttendanceSummary.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-sm text-slate-500">
                        No attendance data
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Daily Time In/Out */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Daily Time In/Out</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Employee</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Time In</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Time Out</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAttendance.slice(0, 50).map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        {rec.employee?.full_name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatDate(rec.date)}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatTime(record.time_in ?? null)}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatTime(record.time_out ?? null)}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{rec.total_hours || '--'}</td>
                    </tr>
                  ))}
                  {filteredAttendance.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">
                        No records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Debts Report */}
      {activeTab === 'debts' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Employee Debts</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Employee</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Type</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Amount</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Remaining</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Description</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDebts.map((debt) => (
                  <tr key={debt.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {debt.employee?.full_name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {DEBT_TYPE_LABELS[debt.debt_type as keyof typeof DEBT_TYPE_LABELS]}
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
                  </tr>
                ))}
                {filteredDebts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                      No debt records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Salary Records */}
      {activeTab === 'salary' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Salary Records</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Employee</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Period</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Days</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Gross</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Deductions</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Net</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayroll.map((pr) => (
                  <tr key={pr.id} className="hover:bg-slate-50">
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
                  </tr>
                ))}
                {filteredPayroll.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500">
                      No salary records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
