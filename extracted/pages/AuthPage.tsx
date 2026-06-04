import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Music2, LogIn, UserPlus, Eye, EyeOff } from 'lucide-react';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') await signUp(email, password);
      else await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Left — Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[360px]">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--accent)', boxShadow: '0 0 16px rgba(99,102,241,0.4)' }}
            >
              <Music2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-[17px]" style={{ color: 'var(--text-primary)' }}>
              BandManager
            </span>
          </div>

          <h2
            className="text-[24px] font-bold tracking-tight mb-1"
            style={{ color: 'var(--text-primary)' }}
          >
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-[14px] mb-8" style={{ color: 'var(--text-secondary)' }}>
            {mode === 'login'
              ? 'Sign in to your BandManager account'
              : 'Start managing your music career'}
          </p>

          {/* Tabs */}
          <div
            className="flex p-1 rounded-xl mb-6"
            style={{ background: 'var(--bg-elevated)' }}
          >
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(''); }}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[13.5px] font-medium transition-all"
                style={{
                  background: mode === m ? 'var(--accent)' : 'transparent',
                  color: mode === m ? '#fff' : 'var(--text-secondary)',
                  boxShadow: mode === m ? '0 1px 4px rgba(99,102,241,0.3)' : 'none',
                }}
              >
                {m === 'login'
                  ? <><LogIn className="w-3.5 h-3.5" /> Sign in</>
                  : <><UserPlus className="w-3.5 h-3.5" /> Register</>
                }
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block text-[13px] font-medium mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input-base"
              />
            </div>

            <div>
              <label
                className="block text-[13px] font-medium mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
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

            {error && (
              <div
                className="rounded-xl px-4 py-3 text-[13px]"
                style={{
                  background: 'var(--error-muted)',
                  border: '1px solid rgba(248,113,113,0.2)',
                  color: 'var(--error)',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-3 text-[14px] mt-2"
            >
              {loading
                ? 'Loading...'
                : mode === 'login' ? 'Sign in' : 'Create account'
              }
            </button>
          </form>
        </div>
      </div>

      {/* Right — Brand panel (desktop only) */}
      <div
        className="hidden lg:flex w-[42%] relative overflow-hidden flex-col justify-center px-16"
        style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #6d28d9 100%)',
        }}
      >
        {/* Decorative elements */}
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'rgba(255,255,255,0.15)' }}
        />
        <div
          className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full opacity-15"
          style={{ background: 'rgba(255,255,255,0.1)' }}
        />
        <div
          className="absolute top-1/2 right-8 w-48 h-48 rounded-full opacity-10"
          style={{ background: 'rgba(255,255,255,0.2)', transform: 'translateY(-50%)' }}
        />

        <div className="relative z-10">
          {/* Logo mark */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-10"
            style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}
          >
            <Music2 className="w-7 h-7 text-white" />
          </div>

          <h1 className="text-[38px] font-bold text-white leading-tight mb-4 tracking-tight">
            Band<br />Manager
          </h1>

          <p className="text-[16px] leading-relaxed mb-10" style={{ color: 'rgba(255,255,255,0.75)' }}>
            The complete platform for music managers. Organize bands, plan tours, and track everything in one place.
          </p>

          <div className="space-y-3.5">
            {[
              'Manage bands, artists & songs',
              'Plan and track world tours',
              'Monitor ratings and analytics',
            ].map(f => (
              <div key={f} className="flex items-center gap-3">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.25)' }}
                >
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
