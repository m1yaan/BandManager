import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../lib/api';
import { Music2, LogIn, UserPlus, Eye, EyeOff, Briefcase, Mic2 } from 'lucide-react';

function getInitialMode(): 'login' | 'register' {
  const params = new URLSearchParams(window.location.search);
  return params.get('mode') === 'register' ? 'register' : 'login';
}

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(getInitialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('manager');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') await signUp(email, password, role);
      else await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-base)' }}>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[380px] animate-fade-in">
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--accent)', boxShadow: '0 0 16px var(--accent-glow)' }}
            >
              <Music2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-[17px]" style={{ color: 'var(--text-primary)' }}>BandManager</span>
          </div>

          <h2 className="text-[26px] font-bold tracking-tight mb-1" style={{ color: 'var(--text-primary)' }}>
            {mode === 'login' ? 'Добро пожаловать' : 'Регистрация'}
          </h2>
          <p className="text-[14px] mb-8" style={{ color: 'var(--text-secondary)' }}>
            {mode === 'login' ? 'Войдите в ваш аккаунт BandManager' : 'Создайте аккаунт и начните работу'}
          </p>

          <div className="flex p-1 rounded-xl mb-6" style={{ background: 'var(--bg-elevated)' }}>
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(''); }}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[13.5px] font-medium transition-all"
                style={{
                  background: mode === m ? 'var(--accent)' : 'transparent',
                  color: mode === m ? '#fff' : 'var(--text-secondary)',
                  boxShadow: mode === m ? '0 0 12px var(--accent-glow)' : 'none',
                }}
              >
                {m === 'login'
                  ? <><LogIn className="w-3.5 h-3.5" /> Вход</>
                  : <><UserPlus className="w-3.5 h-3.5" /> Регистрация</>
                }
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="вы@example.com" className="input-base" />
            </div>

            <div>
              <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Пароль</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Минимум 6 символов"
                  className="input-base pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 btn btn-ghost btn-icon"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Я являюсь</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'manager', label: 'Менеджером',    icon: <Briefcase className="w-4 h-4" />, desc: 'Полный доступ' },
                    { value: 'artist',  label: 'Артистом',      icon: <Mic2 className="w-4 h-4" />,      desc: 'Просмотр данных' },
                  ].map(({ value, label, icon, desc }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRole(value as UserRole)}
                      className="p-3 rounded-xl text-left transition-all"
                      style={{
                        background: role === value ? 'var(--accent-muted)' : 'var(--bg-elevated)',
                        border: `1px solid ${role === value ? 'var(--accent)' : 'var(--border-base)'}`,
                        boxShadow: role === value ? '0 0 8px var(--accent-glow)' : 'none',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1" style={{ color: role === value ? 'var(--accent)' : 'var(--text-secondary)' }}>
                        {icon}
                        <span className="text-[13.5px] font-medium">{label}</span>
                      </div>
                      <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl px-4 py-3 text-[13px]" style={{ background: 'var(--error-muted)', border: '1px solid rgba(248,113,113,0.2)', color: 'var(--error)' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn btn-primary w-full py-3 text-[14px] mt-2">
              {loading ? 'Загрузка...' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
            </button>
          </form>
        </div>
      </div>

      <div
        className="hidden lg:flex w-[42%] relative overflow-hidden flex-col justify-center px-16"
        style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #6d28d9 100%)' }}
      >
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }} />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div className="relative z-10">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-10" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <Music2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-[38px] font-bold text-white leading-tight mb-4 tracking-tight">Band<br />Manager</h1>
          <p className="text-[16px] leading-relaxed mb-10" style={{ color: 'rgba(255,255,255,0.75)' }}>
            Полная платформа для музыкальных менеджеров и артистов.
          </p>
          <div className="space-y-3.5">
            {['Управление группами, исполнителями и песнями', 'Планирование и учёт мировых туров', 'Входящие концертные запросы', 'Аналитика и отчёты'].map(f => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.25)' }}>
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-[14px]" style={{ color: 'rgba(255,255,255,0.85)' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
