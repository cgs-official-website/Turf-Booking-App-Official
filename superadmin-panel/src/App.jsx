import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
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
import { SubscriptionsView } from './views/SubscriptionsView';
import { ReviewsView } from './views/ReviewsView';
import { NotFoundView } from './views/NotFoundView';

function DashboardApp() {
  const { isAuthenticated } = useAuth();

  const getTabFromUrl = () => {
    if (typeof window === 'undefined') return 'overview';
    const hash = window.location.hash.replace(/^#\/?/, '').trim();
    if (hash) return hash;
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
      setActiveTab(getTabFromUrl());
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

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {/* Sidebar Navigation (Drawer on mobile, Sticky on desktop) */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        pendingKycCount={statsData.stats?.pendingKycs || 0}
        openReportsCount={statsData.stats?.openReports || 0}
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
          {activeTab === 'reports' && <ReportsView onUpdateStats={fetchStats} />}
          {activeTab === 'subscriptions' && <SubscriptionsView />}

          {!['overview', 'kyc', 'turfs', 'bookings', 'vendors', 'users', 'matches', 'reviews', 'reports', 'subscriptions'].includes(activeTab) && (
            <NotFoundView onNavigateHome={() => setActiveTab('overview')} />
          )}
        </main>
      </div>
    </div>
  );
}

import { ModalProvider } from './context/ModalContext';

export default function App() {
  return (
    <AuthProvider>
      <ModalProvider>
        <DashboardApp />
      </ModalProvider>
    </AuthProvider>
  );
}
