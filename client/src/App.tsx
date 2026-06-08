import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { usePermissions } from './hooks/usePermissions';
import AuthPage from './pages/AuthPage';
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
import SupportPage from './sections/SupportPage';

export type Section =
  | 'dashboard' | 'bands' | 'singers' | 'songs' | 'tours'
  | 'reports' | 'profile' | 'messages' | 'calendar'
  | 'admin' | 'support';

function AppContent() {
  const { user, loading } = useAuth();
  const { isManager, isAdmin } = usePermissions();
  const [section, setSection] = useState<Section>('dashboard');

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

  if (!user) return <AuthPage />;

  const handleDashboardNavigate = (s: string) => setSection(s as Section);

  const renderSection = () => {
    switch (section) {
      case 'dashboard': return <Dashboard onNavigate={handleDashboardNavigate} />;
      case 'bands':     return <Bands />;
      case 'singers':   return <Singers />;
      case 'songs':     return <Songs />;
      case 'tours':     return <Tours />;
      case 'calendar':  return <CalendarPage />;
      case 'messages':  return (isManager || isAdmin) ? <MessagesPage /> : <Dashboard onNavigate={handleDashboardNavigate} />;
      case 'reports':   return (isManager || isAdmin) ? <ReportsPage /> : <Dashboard onNavigate={handleDashboardNavigate} />;
      case 'admin':     return isAdmin ? <AdminUsersPage /> : <Dashboard onNavigate={handleDashboardNavigate} />;
      case 'support':   return <SupportPage />;
      case 'profile':   return <ProfilePage />;
      default:          return <Dashboard onNavigate={handleDashboardNavigate} />;
    }
  };

  return (
    <Layout activeSection={section} onNavigate={setSection}>
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
