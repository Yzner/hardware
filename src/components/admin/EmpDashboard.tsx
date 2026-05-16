import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';
import StatCard from '../../contexts/StatCard';
import { Users, UserCheck, Banknote, AlertTriangle } from 'lucide-react';

export default function EmpDashboard() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    totalSalaryExpenses: 0,
    totalDebts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const today = new Date().toISOString().split('T')[0];

      const [empRes, attRes, debtRes] = await Promise.all([
        supabase.from('employees').select('salary_rate', { count: 'exact' }).eq('is_active', true),
        supabase.from('attendance').select('id', { count: 'exact' }).eq('date', today),
        supabase.from('debts').select('remaining_balance').eq('is_fully_paid', false),
      ]);

      const totalSalary = (empRes.data || []).reduce((sum, e) => sum + Number(e.salary_rate), 0);
      const totalDebts = (debtRes.data || []).reduce((sum, d) => sum + Number(d.remaining_balance), 0);

      setStats({
        totalEmployees: empRes.count || 0,
        presentToday: attRes.count || 0,
        totalSalaryExpenses: totalSalary,
        totalDebts: totalDebts,
      });
      setLoading(false);
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Overview of your workforce</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Total Employees"
          value={stats.totalEmployees}
          icon={Users}
          color="blue"
        />
        <StatCard
          label="Present Today"
          value={stats.presentToday}
          icon={UserCheck}
          color="emerald"
        />
        <StatCard
          label="Total Salary Rate/Day"
          value={formatCurrency(stats.totalSalaryExpenses)}
          icon={Banknote}
          color="amber"
        />
        <StatCard
          label="Total Employee Debts"
          value={formatCurrency(stats.totalDebts)}
          icon={AlertTriangle}
          color="rose"
        />
      </div>
    </div>
  );
}
