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

export type Section =
  | 'dashboard' | 'bands' | 'singers' | 'songs' | 'tours'
  | 'reports' | 'profile' | 'messages' | 'calendar';

function AppContent() {
  const { user, loading } = useAuth();
  const { isManager } = usePermissions();
  const [section, setSection] = useState<Section>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="w-9 h-9 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!user) return <AuthPage />;

  const renderSection = () => {
    switch (section) {
      case 'dashboard': return <Dashboard onNavigateToTours={() => setSection('tours')} />;
      case 'bands':     return <Bands />;
      case 'singers':   return <Singers />;
      case 'songs':     return <Songs />;
      case 'tours':     return <Tours />;
      case 'calendar':  return <CalendarPage />;
      case 'messages':  return isManager ? <MessagesPage /> : <Dashboard onNavigateToTours={() => setSection('tours')} />;
      case 'reports':   return isManager ? <ReportsPage /> : <Dashboard onNavigateToTours={() => setSection('tours')} />;
      case 'profile':   return <ProfilePage />;
      default:          return <Dashboard onNavigateToTours={() => setSection('tours')} />;
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
