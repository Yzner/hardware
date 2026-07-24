import { useState, type ReactElement } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import RoleSelection from './pages/RoleSelection';
import Login from './pages/Login';
import DashboardLayout from './components/shared/Sidebar';
import AdminDashboard from './components/admin/AdminDashboard';
import BranchForm from './components/admin/BranchForm';
import ProductManager from './components/admin/ProductManager';
import StockRequests from './components/admin/StockRequests';
import ActivityLogs from './components/admin/ActivityLogs';
import IncomeReports from './components/admin/IncomeReports';
import Notifications from './components/admin/Notifications';
import AllBranches from './components/admin/AllBranches';
import BranchActivityDetail from './components/admin/BranchActivityDetail';
import BranchProductsDetail from './components/admin/BranchProductsDetail';
import POSInterface from './components/branch/POSInterface';
import StockRequest from './components/branch/StockRequest';
import SalesHistory from './components/branch/SalesHistory';
import BranchNotifications from './components/branch/BranchNotifications';
import Attendance from './components/admin/Attendance';
import Debts from './components/admin/Debts';
import Employees from './components/admin/Employees';
import Payroll from './components/admin/Payroll';
import Reports from './components/admin/Reports';
import AttendanceCheckIn from './components/admin/AttendanceCheckIn';
import SendItem from './components/branch/SendItem';
import CollectionSummary from './components/admin/CollectionSummary';
import Finances from './components/admin/Finances';
import Storefront from './components/public/StoreFront';

import {
  LayoutDashboard,
  Users,
  Package,
  ClipboardList,
  Bell,
  TrendingUp,
  FileText,
  Banknote,
  FileBarChart,
  History,
  Briefcase,
  ShoppingCart,
  Send,
  BookOpen,
} from 'lucide-react';

type AdminTab =
  | 'dashboard'
  | 'all-branches'
  | 'products'
  | 'stock-requests'
  | 'activity-logs'
  | 'income'
  | 'collection-summary'
  | 'Notifications'
  | 'Attendance'
  | 'Debts'
  | 'Payroll'
  | 'Reports'
  | 'finances'
  | 'Employees';

type BranchTab =
  | 'pos'
  | 'stock-request'
  | 'send-item'
  | 'sales-history'
  | 'notifications';

interface Profile {
  id: string;
  username: string;
  role: string;
  branch_name: string | null;
  location: string | null;
}

/* ------------------------------------------------------------------ */
/*  /portal  ->  role selection (admin or branch)                      */
/*  /portal/:role  ->  login form for that role                        */
/* ------------------------------------------------------------------ */
function PortalRoleSelect() {
  const navigate = useNavigate();
  return (
    <RoleSelection
      onSelectRole={(role) => navigate(`/portal/${role}`)}
      onViewStorefront={() => navigate('/')}
    />
  );
}

function PortalLogin() {
  const navigate = useNavigate();
  const { role } = useParams<{ role: 'admin' | 'branch' }>();
  const safeRole: 'admin' | 'branch' = role === 'branch' ? 'branch' : 'admin';
  return <Login role={safeRole} onBack={() => navigate('/portal')} />;
}

/* ------------------------------------------------------------------ */
/*  /  ->  public storefront                                           */
/* ------------------------------------------------------------------ */
function PublicStorefront() {
  const navigate = useNavigate();
  return <Storefront onAdminLogin={() => navigate('/portal/admin')} />;
}

/* ------------------------------------------------------------------ */
/*  /dashboard  ->  authenticated admin or branch dashboard            */
/* ------------------------------------------------------------------ */
function Dashboard() {
  const { profile } = useAuth();
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');
  const [branchTab, setBranchTab] = useState<BranchTab>('pos');
  const [viewingBranch, setViewingBranch] = useState<Profile | null>(null);
  const [branchViewMode, setBranchViewMode] = useState<'activity' | 'products'>('activity');

  if (profile?.role === 'admin') {
    const adminNavItems = [
      { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { key: 'all-branches', label: 'All Branches', icon: <Users className="w-4 h-4" /> },
      { key: 'Employees', label: 'Employees', icon: <Briefcase className="w-4 h-4" /> },
      { key: 'products', label: 'Products', icon: <Package className="w-4 h-4" /> },
      { key: 'stock-requests', label: 'Stock Requests', icon: <ShoppingCart className="w-4 h-4" /> },
      { key: 'activity-logs', label: 'Activity Logs', icon: <History className="w-4 h-4" /> },
      { key: 'Attendance', label: 'Attendance', icon: <ClipboardList className="w-4 h-4" /> },
      { key: 'Debts', label: 'Employee Debts', icon: <Banknote className="w-4 h-4" /> },
      { key: 'Payroll', label: 'Payroll', icon: <FileText className="w-4 h-4" /> },
      { key: 'Reports', label: 'Employee Reports', icon: <FileBarChart className="w-4 h-4" /> },
      { key: 'income', label: 'Income Reports', icon: <TrendingUp className="w-4 h-4" /> },
      { key: 'collection-summary', label: 'Collection Summary', icon: <BookOpen className="w-4 h-4" /> },
      { key: 'Notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
      { key: 'finances', label: 'Finances', icon: <Banknote className="w-4 h-4" /> },
    ];

    const renderAdminContent = () => {
      switch (adminTab) {
        case 'dashboard':
          return viewingBranch ? (
            <div>
              <button
                onClick={() => setViewingBranch(null)}
                className="text-sm text-emerald-600 hover:text-emerald-700 mb-4 font-medium"
              >
                &larr; Back to Dashboard
              </button>
              <ActivityLogs branchFilter={viewingBranch} />
            </div>
          ) : (
            <AdminDashboard
              onViewBranch={(b) => {
                setViewingBranch(b);
                setAdminTab('activity-logs');
              }}
            />
          );
        case 'all-branches':
          return viewingBranch ? (
            branchViewMode === 'products' ? (
              <BranchProductsDetail branch={viewingBranch} onBack={() => setViewingBranch(null)} />
            ) : (
              <BranchActivityDetail branch={viewingBranch} onBack={() => setViewingBranch(null)} />
            )
          ) : (
            <AllBranches
              onViewActivity={(b) => {
                setViewingBranch(b);
                setBranchViewMode('activity');
              }}
              onViewProducts={(b) => {
                setViewingBranch(b);
                setBranchViewMode('products');
              }}
            />
          );
        case 'products':
          return <ProductManager />;
        case 'stock-requests':
          return <StockRequests />;
        case 'activity-logs':
          return <ActivityLogs />;
        case 'income':
          return <IncomeReports />;
        case 'collection-summary':
          return <CollectionSummary />;
        case 'finances':
          return <Finances />;
        case 'Notifications':
          return <Notifications />;
        case 'Attendance':
          return <Attendance />;
        case 'Debts':
          return <Debts />;
        case 'Employees':
          return <Employees />;
        case 'Payroll':
          return <Payroll />;
        case 'Reports':
          return <Reports />;
      }
    };

    return (
      <DashboardLayout
        navItems={adminNavItems}
        activeKey={adminTab}
        onNavChange={(k) => {
          setAdminTab(k as AdminTab);
          setViewingBranch(null);
        }}
      >
        {adminTab === 'dashboard' && !viewingBranch && (
          <div className="mb-6">
            <BranchForm onCreated={() => {}} />
          </div>
        )}
        {renderAdminContent()}
      </DashboardLayout>
    );
  }

  // Branch role
  const branchNavItems = [
    { key: 'pos', label: 'Point of Sale', icon: <ShoppingCart className="w-4 h-4" /> },
    { key: 'stock-request', label: 'Request Stock', icon: <Send className="w-4 h-4" /> },
    { key: 'sales-history', label: 'Sales History', icon: <History className="w-4 h-4" /> },
    { key: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { key: 'send-item', label: 'Send Item', icon: <Send className="w-4 h-4" /> },
  ];

  const renderBranchContent = () => {
    switch (branchTab) {
      case 'pos':
        return <POSInterface />;
      case 'stock-request':
        return <StockRequest />;
      case 'sales-history':
        return <SalesHistory />;
      case 'notifications':
        return <BranchNotifications />;
      case 'send-item':
        return <SendItem />;
    }
  };

  return (
    <DashboardLayout
      navItems={branchNavItems}
      activeKey={branchTab}
      onNavChange={(k) => setBranchTab(k as BranchTab)}
    >
      {renderBranchContent()}
    </DashboardLayout>
  );
}

/* ------------------------------------------------------------------ */
/*  Route guards                                                       */
/* ------------------------------------------------------------------ */
function RequireAuth({ children }: { children: ReactElement }) {
  const { user, profile, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }
  if (!user || !profile) {
    return <Navigate to="/portal" replace />;
  }
  return children;
}

function RedirectIfAuthed({ children }: { children: ReactElement }) {
  const { user, profile, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }
  if (user && profile) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public storefront lives at the root URL */}
      <Route
        path="/"
        element={
          <RedirectIfAuthed>
            <PublicStorefront />
          </RedirectIfAuthed>
        }
      />

      {/* Staff portal lives at its own URL, separate from the public site */}
      <Route
        path="/portal"
        element={
          <RedirectIfAuthed>
            <PortalRoleSelect />
          </RedirectIfAuthed>
        }
      />
      <Route
        path="/portal/:role"
        element={
          <RedirectIfAuthed>
            <PortalLogin />
          </RedirectIfAuthed>
        }
      />

      {/* Authenticated dashboard */}
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      />

      {/* Standalone attendance check-in link (e.g. QR code) */}
      <Route path="/attendance/check-in" element={<AttendanceCheckIn />} />

      {/* Fallback: unknown paths go to the public storefront */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}