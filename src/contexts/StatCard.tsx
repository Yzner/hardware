import { classNames } from '../lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: 'emerald' | 'blue' | 'amber' | 'rose';
}

const colorMap = {
  emerald: 'bg-emerald-50 text-emerald-600',
  blue: 'bg-blue-50 text-blue-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
};

const iconBgMap = {
  emerald: 'bg-emerald-100',
  blue: 'bg-blue-100',
  amber: 'bg-amber-100',
  rose: 'bg-rose-100',
};

export default function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={classNames('p-3 rounded-xl', iconBgMap[color])}>
          <Icon size={24} className={colorMap[color].split(' ')[1]} />
        </div>
      </div>
    </div>
  );
}
