import { useState } from 'react';
import { Shield, Store } from 'lucide-react';

interface RoleSelectionProps {
  onSelectRole: (role: 'admin' | 'branch') => void;
}

export default function RoleSelection({ onSelectRole }: RoleSelectionProps) {
  const [hoveredRole, setHoveredRole] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/20 rounded-2xl mb-6">
            <Store className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">POS System</h1>
          <p className="text-slate-400 text-lg">Select your role to continue</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <button
            onClick={() => onSelectRole('admin')}
            onMouseEnter={() => setHoveredRole('admin')}
            onMouseLeave={() => setHoveredRole(null)}
            className="group relative bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 text-left transition-all duration-300 hover:bg-slate-800 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-1"
          >
            <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl mb-6 transition-all duration-300 ${hoveredRole === 'admin' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-slate-700'}`}>
              <Shield className={`w-7 h-7 transition-colors duration-300 ${hoveredRole === 'admin' ? 'text-white' : 'text-slate-300'}`} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Admin</h2>
            <p className="text-slate-400 leading-relaxed">Manage branches, products, stock requests, and view reports across all locations.</p>
            <div className="mt-6 flex items-center text-emerald-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              Continue as Admin
              <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </div>
          </button>

          <button
            onClick={() => onSelectRole('branch')}
            onMouseEnter={() => setHoveredRole('branch')}
            onMouseLeave={() => setHoveredRole(null)}
            className="group relative bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 text-left transition-all duration-300 hover:bg-slate-800 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1"
          >
            <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl mb-6 transition-all duration-300 ${hoveredRole === 'branch' ? 'bg-blue-500 shadow-lg shadow-blue-500/30' : 'bg-slate-700'}`}>
              <Store className={`w-7 h-7 transition-colors duration-300 ${hoveredRole === 'branch' ? 'text-white' : 'text-slate-300'}`} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Branch</h2>
            <p className="text-slate-400 leading-relaxed">Process sales, request stock, and view your branch performance and history.</p>
            <div className="mt-6 flex items-center text-blue-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              Continue as Branch
              <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
