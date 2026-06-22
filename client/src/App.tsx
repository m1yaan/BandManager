import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { usePermissions } from './hooks/usePermissions';
import { useRouter } from './hooks/useRouter';
import AuthPage from './pages/AuthPage';
import LandingPage from './pages/LandingPage';
import Layout from './components/Layout';
import Dashboard from './sections/Dashboard';
import Bands from './sections/Bands';
import Singers from './sections/Singers';
import Songs from './sections/Songs';
import Tours from './sections/Tours';
import ReportsPage from './sections/ReportsPage';
import ProfilePage from './sections/ProfilePage';
import MessagesPage from './sections/MessagesPage';
import CalendarPage from './sections/CalendarPage';
import AdminUsersPage from './sections/admin/AdminUsersPage';
import AdminAuditPage from './sections/admin/AdminAuditPage';
import SupportPage from './sections/SupportPage';

export type Section =
  | 'dashboard' | 'bands' | 'singers' | 'songs' | 'tours'
  | 'reports' | 'profile' | 'messages' | 'calendar'
  | 'admin' | 'admin-audit' | 'support';

export type NavigateParams = {
  bandId?: string;
  singerId?: string;
  songId?: string;
  tourId?: string;
};

export type NavigateFn = (section: Section, params?: NavigateParams) => void;

function AppContent() {
  const { user, loading } = useAuth();
  const { isManager, isAdmin } = usePermissions();
  const { pathname, navigate } = useRouter();
  const [section, setSection] = useState<Section>('dashboard');
  const [navParams, setNavParams] = useState<NavigateParams>({});

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div
          className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  if (!user) {
    if (pathname === '/login' || pathname.startsWith('/login')) {
      return <AuthPage />;
    }
    if (pathname === '/' || pathname === '') {
      return <LandingPage onNavigate={navigate} />;
    }
    return <LandingPage onNavigate={navigate} />;
  }

  const handleNavigate: NavigateFn = (s, params = {}) => {
    setSection(s);
    setNavParams(params);
  };

  const handleDashboardNavigate = (s: string) => handleNavigate(s as Section);

  const renderSection = () => {
    switch (section) {
      case 'dashboard': return <Dashboard onNavigate={handleDashboardNavigate} />;
      case 'bands':     return <Bands onNavigate={handleNavigate} initialBandId={navParams.bandId} />;
      case 'singers':   return <Singers onNavigate={handleNavigate} initialSingerId={navParams.singerId} />;
      case 'songs':     return <Songs onNavigate={handleNavigate} />;
      case 'tours':     return <Tours onNavigate={handleNavigate} />;
      case 'calendar':  return <CalendarPage />;
      case 'messages':  return (isManager || isAdmin) ? <MessagesPage /> : <Dashboard onNavigate={handleDashboardNavigate} />;
      case 'reports':   return (isManager || isAdmin) ? <ReportsPage /> : <Dashboard onNavigate={handleDashboardNavigate} />;
      case 'admin':     return isAdmin ? <AdminUsersPage onNavigate={handleNavigate} /> : <Dashboard onNavigate={handleDashboardNavigate} />;
      case 'admin-audit': return isAdmin ? <AdminAuditPage /> : <Dashboard onNavigate={handleDashboardNavigate} />;
      case 'support':   return <SupportPage />;
      case 'profile':   return <ProfilePage />;
      default:          return <Dashboard onNavigate={handleDashboardNavigate} />;
    }
  };

  return (
    <Layout activeSection={section} onNavigate={(s) => handleNavigate(s)}>
      {renderSection()}
    </Layout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
