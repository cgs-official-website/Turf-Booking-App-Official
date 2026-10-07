import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ModalProvider } from './context/ModalContext';
import { api } from './api/client';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginView } from './views/LoginView';
import { OverviewView } from './views/OverviewView';
import { KycReviewView } from './views/KycReviewView';
import { TurfsView } from './views/TurfsView';
import { BookingsView } from './views/BookingsView';
import { VendorsView } from './views/VendorsView';
import { UsersView } from './views/UsersView';
import { MatchesView } from './views/MatchesView';
import { ReportsView } from './views/ReportsView';
import { InquiriesView } from './views/InquiriesView';
import { SubscriptionsView } from './views/SubscriptionsView';
import { ReviewsView } from './views/ReviewsView';
import { NotFoundView } from './views/NotFoundView';
import { Landing } from './pages/Landing/Landing';

function DashboardApp() {
  const { isAuthenticated, admin } = useAuth();
  const navigate = useNavigate();

  const getTabFromUrl = () => {
    if (typeof window === 'undefined') return 'overview';
    const hash = window.location.hash.replace(/^#\/?/, '').trim();
    if (hash && hash !== 'admin') return hash;
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'overview';
  };

  const [activeTab, setActiveTab] = useState(getTabFromUrl);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [statsData, setStatsData] = useState({
    stats: {},
    recentBookings: [],
    recentVendors: [],
    recentReports: [],
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
      const tab = getTabFromUrl();
      if (tab) setActiveTab(tab);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    if (typeof window !== 'undefined') {
      window.location.hash = `#/${tabId}`;
    }
  };

  const fetchStats = async () => {
    if (!isAuthenticated) return;
    setIsRefreshing(true);
    try {
      const res = await api.getStats();
      if (res.success && res.data) {
        setStatsData(res.data);
      }
    } catch (err) {
      console.warn('Failed to fetch stats:', err.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
      const interval = setInterval(fetchStats, 15000); // 15s live polling
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const isSuperAdmin =
    isAuthenticated &&
    admin &&
    (admin.role === 'superadmin' || admin.role === 'admin' || String(admin.email || '').includes('admin@'));

  if (!isSuperAdmin) {
    return <NotFoundView onNavigateHome={() => navigate('/')} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col lg:flex-row transition-colors duration-200">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        pendingKycCount={statsData.stats?.pendingKycs || 0}
        openReportsCount={statsData.stats?.openReports || 0}
        pendingInquiriesCount={statsData.stats?.pendingEnquiries || 0}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onRefresh={fetchStats}
          isRefreshing={isRefreshing}
          pendingCount={statsData.stats?.pendingKycs || 0}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />

        <main className="flex-1 p-3 sm:p-5 lg:p-6 overflow-y-auto max-w-7xl w-full mx-auto">
          {activeTab === 'overview' && (
            <OverviewView
              stats={statsData.stats}
              recentBookings={statsData.recentBookings}
              recentVendors={statsData.recentVendors}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'kyc' && <KycReviewView onUpdateStats={fetchStats} />}
          {activeTab === 'turfs' && <TurfsView onUpdateStats={fetchStats} />}
          {activeTab === 'bookings' && <BookingsView />}
          {activeTab === 'vendors' && <VendorsView />}
          {activeTab === 'users' && <UsersView />}
          {activeTab === 'matches' && <MatchesView />}
          {activeTab === 'reviews' && <ReviewsView />}
          {activeTab === 'inquiries' && <InquiriesView onUpdateStats={fetchStats} />}
          {activeTab === 'reports' && <ReportsView onUpdateStats={fetchStats} />}
          {activeTab === 'subscriptions' && <SubscriptionsView />}

          {!['overview', 'kyc', 'turfs', 'bookings', 'vendors', 'users', 'matches', 'reviews', 'inquiries', 'reports', 'subscriptions'].includes(activeTab) && (
            <NotFoundView onNavigateHome={() => setActiveTab('overview')} />
          )}
        </main>
      </div>
    </div>
  );
}

function CgsLoginRoute() {
  const { isAuthenticated, admin } = useAuth();
  const navigate = useNavigate();

  const isSuperAdmin = Boolean(
    isAuthenticated &&
    admin &&
    (admin.role === 'superadmin' || admin.role === 'admin' || String(admin.email || '').includes('admin@'))
  );

  if (isSuperAdmin) {
    return <DashboardApp />;
  }

  return <LoginView onNavigateHome={() => navigate('/')} />;
}

function MainRoutes() {
  const navigate = useNavigate();
  const location = useLocation();

  // If user visits via hash bookmark or url like /cgs, #cgs, /admin, #admin
  useEffect(() => {
    const rawHash = (window.location.hash || '').replace(/^#\/?/, '').trim().toLowerCase();
    const rawPath = (window.location.pathname || '').toLowerCase();

    if (rawHash === 'cgs' || rawHash.startsWith('cgs/') || rawPath === '/cgs' || rawPath.startsWith('/cgs/')) {
      if (location.pathname !== '/cgs') {
        navigate('/cgs');
      }
    } else if (rawHash === 'admin' || rawHash.startsWith('admin/')) {
      if (!location.pathname.startsWith('/admin')) {
        navigate('/admin');
      }
    }
  }, [location, navigate]);

  return (
    <Routes>
      {/* Root Route ALWAYS serves the Landing Page */}
      <Route
        path="/"
        element={<Landing />}
      />

      {/* Secret CGS Super Admin Login Route */}
      <Route
        path="/cgs"
        element={<CgsLoginRoute />}
      />
      <Route
        path="/cgs/*"
        element={<CgsLoginRoute />}
      />

      {/* Explore / Turfs route */}
      <Route
        path="/turfs"
        element={<Landing />}
      />

      {/* Public attempt to access /login shows 404 */}
      <Route
        path="/login"
        element={<NotFoundView onNavigateHome={() => navigate('/')} />}
      />

      {/* Super Admin Dashboard Routes (Protected: 404 if not authenticated as Super Admin) */}
      <Route
        path="/admin/*"
        element={<DashboardApp />}
      />

      {/* Fallback route: 404 Page Not Found */}
      <Route
        path="*"
        element={<NotFoundView onNavigateHome={() => navigate('/')} />}
      />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ModalProvider>
          <BrowserRouter>
            <MainRoutes />
          </BrowserRouter>
        </ModalProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
