import { ReactNode, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Music2, Users, Mic2, Radio, MapPin, LogOut, Menu, X,
  LayoutDashboard, ChevronRight
} from 'lucide-react';

type Section = 'dashboard' | 'bands' | 'singers' | 'songs' | 'tours';

const navItems: { id: Section; label: string; icon: ReactNode }[] = [
  { id: 'dashboard', label: 'Обзор', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'bands', label: 'Группы', icon: <Music2 className="w-5 h-5" /> },
  { id: 'singers', label: 'Певцы', icon: <Mic2 className="w-5 h-5" /> },
  { id: 'songs', label: 'Песни', icon: <Radio className="w-5 h-5" /> },
  { id: 'tours', label: 'Туры', icon: <MapPin className="w-5 h-5" /> },
];

type Props = {
  activeSection: Section;
  onNavigate: (s: Section) => void;
  children: ReactNode;
};

export default function Layout({ activeSection, onNavigate, children }: Props) {
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-800">
          <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 flex-shrink-0">
            <Music2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">BandManager</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { onNavigate(item.id); setMobileOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group
                ${activeSection === item.id
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
            >
              <span className={activeSection === item.id ? 'text-amber-400' : 'text-slate-500 group-hover:text-slate-300'}>
                {item.icon}
              </span>
              {item.label}
              {activeSection === item.id && (
                <ChevronRight className="w-4 h-4 ml-auto text-amber-400" />
              )}
            </button>
          ))}
        </nav>

        <div className="px-4 pb-6 border-t border-slate-800 pt-4">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500">Менеджер</p>
              <p className="text-sm text-slate-300 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 text-sm font-medium transition-all duration-150"
          >
            <LogOut className="w-4 h-4" />
            Выйти
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur border-b border-slate-800 px-6 py-4 flex items-center gap-4 lg:hidden">
          <button onClick={() => setMobileOpen(true)} className="text-slate-400 hover:text-white">
            <Menu className="w-6 h-6" />
          </button>
          <span className="text-white font-semibold">
            {navItems.find(n => n.id === activeSection)?.label}
          </span>
          <button onClick={() => setMobileOpen(false)} className="ml-auto text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </header>

        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
