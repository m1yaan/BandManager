import { useState, FormEvent } from 'react';
import { toast } from 'sonner';
import {
  Music2,
  LogIn,
  Calculator,
  ListChecks,
  BarChart3,
  UserPlus,
  Users,
  FileBarChart,
  ArrowRight,
} from 'lucide-react';
import { leadsApi } from '../lib/api';

type LandingPageProps = {
  onNavigate: (path: string) => void;
};

const FEATURES = [
  {
    icon: Calculator,
    title: 'Финансовый калькулятор',
    desc: 'Автоматический расчёт чистой прибыли с учётом гонорара, налогов, комиссий и расходов на логистику.',
  },
  {
    icon: ListChecks,
    title: 'Райдеры с прогресс-баром',
    desc: 'Контроль технических требований на каждой площадке — от микрофонов до catering.',
  },
  {
    icon: BarChart3,
    title: 'Аналитика и дашборд',
    desc: 'Все показатели на одной странице: туры, финансы, запросы и статус райдеров.',
  },
] as const;

const STEPS = [
  {
    icon: UserPlus,
    title: 'Зарегистрируйтесь как менеджер',
    desc: 'Создайте аккаунт за минуту и получите доступ ко всем инструментам.',
  },
  {
    icon: Users,
    title: 'Добавьте группы, исполнителей и туры',
    desc: 'Соберите базу артистов, репертуар и распишите концертную программу.',
  },
  {
    icon: FileBarChart,
    title: 'Получайте отчёты и управляйте райдерами',
    desc: 'Следите за прибылью, принимайте запросы и контролируйте подготовку площадок.',
  },
] as const;

export default function LandingPage({ onNavigate }: LandingPageProps) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLeadSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await leadsApi.create(email);
      toast.success('Спасибо! Мы свяжемся с вами');
      setEmail('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось отправить');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 px-4 sm:px-8 py-4"
        style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--glass-border)',
        }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--accent)', boxShadow: '0 0 16px var(--accent-glow)' }}
            >
              <Music2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-[17px]" style={{ color: 'var(--text-primary)' }}>
              BandManager
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/login')}
            className="btn btn-ghost flex items-center gap-2 text-[13.5px] font-medium px-4 py-2"
          >
            <LogIn className="w-4 h-4" />
            Войти
          </button>
        </div>
      </header>

      {/* Hero */}
      <section
        className="relative overflow-hidden px-4 sm:px-8 py-20 sm:py-28 lg:py-36"
        style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #6d28d9 100%)' }}
      >
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }} />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div className="relative z-10 max-w-6xl mx-auto">
          <div
            className="glass-card p-8 sm:p-12 lg:p-14 max-w-3xl animate-fade-in"
            style={{
              background: 'rgba(255,255,255,0.12)',
              borderColor: 'rgba(255,255,255,0.18)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
            }}
          >
            <h1 className="text-[28px] sm:text-[38px] lg:text-[44px] font-bold text-white leading-tight tracking-tight mb-4">
              Замените Excel на умный калькулятор туров
            </h1>
            <p className="text-[15px] sm:text-[17px] leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.82)' }}>
              Создавайте туры, считайте прибыль, управляйте райдерами — всё в одном месте
            </p>
            <button
              type="button"
              onClick={() => onNavigate('/login?mode=register')}
              className="btn btn-primary flex items-center gap-2 px-6 py-3 text-[14px] font-semibold"
            >
              Попробовать бесплатно
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 sm:px-8 py-16 sm:py-24">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-[24px] sm:text-[30px] font-bold text-center mb-3 tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Возможности
          </h2>
          <p className="text-center text-[14px] mb-10 sm:mb-14 max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Всё, что нужно музыкальному менеджеру — без таблиц и хаоса
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="glass-card p-6 sm:p-7">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-[16px] font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  {title}
                </h3>
                <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 sm:px-8 py-16 sm:py-24" style={{ background: 'var(--bg-elevated)' }}>
        <div className="max-w-6xl mx-auto">
          <h2 className="text-[24px] sm:text-[30px] font-bold text-center mb-3 tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Как это работает
          </h2>
          <p className="text-center text-[14px] mb-10 sm:mb-14" style={{ color: 'var(--text-secondary)' }}>
            Три шага до полного контроля над турами
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {STEPS.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} className="relative glass-card p-6 sm:p-7 text-center md:text-left">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold mb-4 mx-auto md:mx-0"
                  style={{ background: 'var(--accent)', color: '#fff', boxShadow: '0 0 12px var(--accent-glow)' }}
                >
                  {i + 1}
                </div>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 mx-auto md:mx-0"
                  style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-[15px] font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  {title}
                </h3>
                <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lead capture */}
      <section className="px-4 sm:px-8 py-16 sm:py-24">
        <div className="max-w-2xl mx-auto glass-card p-8 sm:p-10 text-center">
          <h2 className="text-[22px] sm:text-[26px] font-bold mb-2 tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Ранний доступ
          </h2>
          <p className="text-[14px] mb-6" style={{ color: 'var(--text-secondary)' }}>
            Оставьте email — сообщим о новых функциях и специальных условиях
          </p>
          <form onSubmit={handleLeadSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="вы@example.com"
              className="input-base flex-1"
            />
            <button type="submit" disabled={submitting} className="btn btn-primary px-5 py-2.5 text-[14px] whitespace-nowrap">
              {submitting ? 'Отправка…' : 'Получить ранний доступ'}
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="mt-auto px-4 sm:px-8 py-8"
        style={{ borderTop: '1px solid var(--glass-border)' }}
      >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Music2 className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <span className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              © {new Date().getFullYear()} BandManager
            </span>
          </div>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => toast.info('Раздел в разработке')}
              className="text-[13px] transition-colors hover:opacity-80"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Политика конфиденциальности
            </button>
            <button
              type="button"
              onClick={() => toast.info('Раздел в разработке')}
              className="text-[13px] transition-colors hover:opacity-80"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Пользовательское соглашение
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
