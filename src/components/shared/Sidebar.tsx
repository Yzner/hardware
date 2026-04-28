import { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Shield, Store } from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
  navItems: { key: string; label: string; icon: ReactNode }[];
  activeKey: string;
  onNavChange: (key: string) => void;
}

export default function DashboardLayout({ children, navItems, activeKey, onNavChange }: DashboardLayoutProps) {
  const { profile, signOut } = useAuth();
  const isAdmin = profile?.role === 'admin';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col fixed h-full">
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isAdmin ? 'bg-emerald-500/20' : 'bg-blue-500/20'}`}>
              {isAdmin ? <Shield className="w-5 h-5 text-emerald-400" /> : <Store className="w-5 h-5 text-blue-400" />}
            </div>
            <div>
              <h2 className="text-white font-bold text-sm">{profile?.username}</h2>
              <p className="text-slate-400 text-xs capitalize">{profile?.role}</p>
            </div>
          </div>
          {profile?.branch_name && (
            <p className="text-slate-500 text-xs mt-2 truncate">{profile.branch_name} - {profile.location}</p>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => onNavChange(item.key)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeKey === item.key
                  ? isAdmin
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-blue-500/20 text-blue-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-800">
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
