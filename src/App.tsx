import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import Layout from './components/Layout';
import Dashboard from './sections/Dashboard';
import Bands from './sections/Bands';
import Singers from './sections/Singers';
import Songs from './sections/Songs';
import Tours from './sections/Tours';

type Section = 'dashboard' | 'bands' | 'singers' | 'songs' | 'tours';

function AppContent() {
  const { session, loading } = useAuth();
  const [section, setSection] = useState<Section>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return <AuthPage />;

  const renderSection = () => {
    switch (section) {
      case 'dashboard': return <Dashboard />;
      case 'bands': return <Bands />;
      case 'singers': return <Singers />;
      case 'songs': return <Songs />;
      case 'tours': return <Tours />;
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
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
