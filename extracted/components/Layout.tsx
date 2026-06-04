import { ReactNode, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard, Music2, Mic2, Radio, MapPin,
  LogOut, Menu, ChevronRight, Sun, Moon,
} from 'lucide-react';

type Section = 'dashboard' | 'bands' | 'singers' | 'songs' | 'tours';

const navItems = [
  { id: 'dashboard' as Section, label: 'Overview',  icon: LayoutDashboard, color: '#6366f1' },
  { id: 'bands'     as Section, label: 'Bands',     icon: Music2,           color: '#a78bfa' },
  { id: 'singers'   as Section, label: 'Artists',   icon: Mic2,             color: '#34d399' },
  { id: 'songs'     as Section, label: 'Songs',     icon: Radio,            color: '#60a5fa' },
  { id: 'tours'     as Section, label: 'Tours',     icon: MapPin,           color: '#fb923c' },
];

type Props = {
  activeSection: Section;
  onNavigate: (s: Section) => void;
  children: ReactNode;
};

export default function Layout({ activeSection, onNavigate, children }: Props) {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavigate = useCallback((s: Section) => {
    onNavigate(s);
    setMobileOpen(false);
  }, [onNavigate]);

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'BM';

  const Sidebar = () => (
    <aside
      className={`
        fixed inset-y-0 left-0 z-40 w-[220px] flex flex-col
        transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}
      style={{
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-base)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-5 h-[60px] flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: 'var(--accent)',
            boxShadow: '0 0 12px rgba(99,102,241,0.4)',
          }}
        >
          <Music2 className="w-4 h-4 text-white" />
        </div>
        <span
          className="font-semibold text-[15px] tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          BandManager
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ id, label, icon: Icon, color }) => {
          const active = activeSection === id;
          return (
            <button
              key={id}
              onClick={() => handleNavigate(id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all"
              style={{
                background: active ? 'var(--accent-muted)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-secondary)',
                border: active ? '1px solid var(--accent-border)' : '1px solid transparent',
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                }
              }}
            >
              <Icon
                className="w-4 h-4 flex-shrink-0"
                style={{ color: active ? color : 'var(--text-tertiary)' }}
              />
              <span className="flex-1 text-left">{label}</span>
              {active && (
                <ChevronRight
                  className="w-3.5 h-3.5 opacity-60"
                  style={{ color: 'var(--accent)' }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div
        className="px-3 pb-4 pt-3 space-y-1 flex-shrink-0"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
          }}
        >
          {theme === 'dark'
            ? <Sun className="w-4 h-4" style={{ color: 'var(--warning)' }} />
            : <Moon className="w-4 h-4" style={{ color: 'var(--info)' }} />
          }
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>

        {/* User */}
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
          style={{ background: 'var(--bg-elevated)' }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-white"
            style={{ background: 'var(--accent)' }}
          >
            {initials}
          </div>
          <p
            className="flex-1 text-[12px] truncate min-w-0"
            style={{ color: 'var(--text-secondary)' }}
          >
            {user?.email}
          </p>
          <button
            onClick={signOut}
            title="Sign out"
            className="btn btn-ghost btn-icon flex-shrink-0 p-1"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-base)' }}>
      <Sidebar />

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 lg:ml-[220px] flex flex-col min-h-screen">
        {/* Mobile header */}
        <header
          className="lg:hidden sticky top-0 z-20 flex items-center gap-4 px-5 h-[56px] flex-shrink-0"
          style={{
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            className="btn btn-ghost btn-icon"
          >
            <Menu className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          </button>
          <span
            className="font-semibold text-[15px]"
            style={{ color: 'var(--text-primary)' }}
          >
            {navItems.find(n => n.id === activeSection)?.label}
          </span>
          <button
            onClick={toggleTheme}
            className="btn btn-ghost btn-icon ml-auto"
          >
            {theme === 'dark'
              ? <Sun className="w-4 h-4" style={{ color: 'var(--warning)' }} />
              : <Moon className="w-4 h-4" style={{ color: 'var(--info)' }} />
            }
          </button>
        </header>

        <main className="flex-1 px-5 py-7 lg:px-8 lg:py-8 max-w-5xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
