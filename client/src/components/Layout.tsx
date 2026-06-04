import { ReactNode, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard, Music2, Mic2, Radio, MapPin,
  LogOut, Menu, ChevronRight, Sun, Moon, BarChart3, User,
} from 'lucide-react';
import { Section } from '../App';

const navItems: { id: Section; label: string; icon: typeof LayoutDashboard; color: string }[] = [
  { id: 'dashboard', label: 'Обзор',       icon: LayoutDashboard, color: '#6366f1' },
  { id: 'bands',     label: 'Группы',      icon: Music2,           color: '#a78bfa' },
  { id: 'singers',   label: 'Исполнители', icon: Mic2,             color: '#34d399' },
  { id: 'songs',     label: 'Песни',       icon: Radio,            color: '#60a5fa' },
  { id: 'tours',     label: 'Туры',        icon: MapPin,           color: '#fb923c' },
  { id: 'reports',   label: 'Отчёты',      icon: BarChart3,        color: '#f472b6' },
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

  const initials = user?.name
    ? user.name.slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? 'БМ';

  const Sidebar = () => (
    <aside
      className={`
        fixed inset-y-0 left-0 z-40 w-[220px] flex flex-col
        transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}
      style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border-base)' }}
    >
      {/* Логотип */}
      <div
        className="flex items-center gap-3 px-5 h-[60px] flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--accent)', boxShadow: '0 0 12px rgba(99,102,241,0.4)' }}
        >
          <Music2 className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-[15px] tracking-tight" style={{ color: 'var(--text-primary)' }}>
          BandManager
        </span>
      </div>

      {/* Навигация */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ id, label, icon: Icon, color }) => {
          const active = activeSection === id;
          return (
            <button
              key={id}
              onClick={() => handleNavigate(id)}
              className="nav-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all"
              style={{
                background: active ? 'var(--accent-muted)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-secondary)',
                border: active ? '1px solid var(--accent-border)' : '1px solid transparent',
              }}
            >
              <Icon
                className="w-4 h-4 flex-shrink-0 transition-all duration-150"
                style={{ color: active ? color : 'var(--text-tertiary)' }}
              />
              <span className="flex-1 text-left">{label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 opacity-60" style={{ color: 'var(--accent)' }} />}
            </button>
          );
        })}
      </nav>

      {/* Нижняя панель */}
      <div
        className="px-3 pb-4 pt-3 space-y-1 flex-shrink-0"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        {/* Переключатель темы */}
        <button
          onClick={toggleTheme}
          className="nav-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all"
          style={{ color: 'var(--text-secondary)' }}
        >
          {theme === 'dark'
            ? <Sun className="w-4 h-4" style={{ color: 'var(--warning)' }} />
            : <Moon className="w-4 h-4" style={{ color: 'var(--info)' }} />
          }
          {theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
        </button>

        {/* Профиль */}
        <button
          onClick={() => handleNavigate('profile')}
          className="nav-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
          style={{
            background: activeSection === 'profile' ? 'var(--bg-elevated)' : 'var(--bg-elevated)',
          }}
        >
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt="Аватар"
              className="w-7 h-7 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-white"
              style={{ background: 'var(--accent)' }}
            >
              {initials}
            </div>
          )}
          <div className="flex-1 text-left min-w-0">
            <p className="text-[12px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {user?.name || user?.email?.split('@')[0]}
            </p>
            <p className="text-[11px] truncate" style={{ color: 'var(--text-tertiary)' }}>
              Профиль
            </p>
          </div>
          <User className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
        </button>

        {/* Выйти */}
        <button
          onClick={signOut}
          className="nav-btn w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] transition-all"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Выйти
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-base)' }}>
      <Sidebar />

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="flex-1 lg:ml-[220px] flex flex-col min-h-screen">
        {/* Мобильная шапка */}
        <header
          className="lg:hidden sticky top-0 z-20 flex items-center gap-4 px-5 h-[56px] flex-shrink-0"
          style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}
        >
          <button onClick={() => setMobileOpen(true)} className="btn btn-ghost btn-icon">
            <Menu className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          </button>
          <span className="font-semibold text-[15px]" style={{ color: 'var(--text-primary)' }}>
            {navItems.find(n => n.id === activeSection)?.label ?? 'BandManager'}
          </span>
          <button onClick={toggleTheme} className="btn btn-ghost btn-icon ml-auto">
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