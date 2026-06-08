import { useEffect, useState, memo, useCallback } from 'react';
import { dashboardApi, DashboardStats, FinancialMonth, RiderAttentionItem } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { RecentMessagesWidget } from '../components/dashboard/RecentMessagesWidget';
import {
  Music2, Mic2, Radio, MapPin, TrendingUp, Star, ArrowUpRight,
  AlertTriangle, CheckCircle2, Clock,
} from 'lucide-react';
import { SkeletonCard } from '../components/Skeleton';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';

type StatCardProps = {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bg: string;
  delay?: number;
  onClick?: () => void;
};

const StatCard = memo(({ label, value, icon, color, bg, delay = 0, onClick }: StatCardProps) => (
  <div
    className="glass-card p-6 animate-fade-in transition-all"
    style={{
      animationDelay: `${delay}ms`,
      cursor: onClick ? 'pointer' : 'default',
    }}
    onClick={onClick}
    onMouseEnter={e => {
      if (onClick) {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px) scale(1.02)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)';
      }
    }}
    onMouseLeave={e => {
      if (onClick) {
        (e.currentTarget as HTMLDivElement).style.transform = '';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '';
      }
    }}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={e => { if (onClick && (e.key === 'Enter' || e.key === ' ')) onClick(); }}
  >
    <div className="flex items-start justify-between mb-4">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: bg, color }}
      >
        {icon}
      </div>
      <ArrowUpRight
        className="w-4 h-4 opacity-25 transition-opacity"
        style={{ color: 'var(--text-tertiary)', opacity: onClick ? 0.5 : 0.2 }}
      />
    </div>
    <p className="text-[32px] font-bold tracking-tight leading-none mb-1" style={{ color: 'var(--text-primary)' }}>
      {value.toLocaleString()}
    </p>
    <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{label}</p>
  </div>
));
StatCard.displayName = 'StatCard';

function RiderAttentionWidget({ items, onNavigate }: { items: RiderAttentionItem[]; onNavigate: (s: string) => void }) {
  if (items.length === 0) return null;

  const statusIcon = (status: string) => {
    if (status === 'empty')   return <AlertTriangle className="w-3.5 h-3.5" style={{ color: 'var(--error)' }} />;
    if (status === 'partial') return <Clock className="w-3.5 h-3.5" style={{ color: 'var(--warning)' }} />;
    return <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--success)' }} />;
  };

  return (
    <div className="glass-card overflow-hidden animate-fade-in" style={{ animationDelay: '460ms' }}>
      <div className="flex items-center gap-2.5 px-6 py-4" style={{ borderBottom: '1px solid var(--glass-border)' }}>
        <AlertTriangle className="w-4 h-4" style={{ color: 'var(--warning)' }} />
        <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
          Райдеры требуют внимания
        </h2>
        <span className="badge ml-auto" style={{ background: 'var(--warning-muted)', color: 'var(--warning)' }}>
          {items.length}
        </span>
      </div>
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => onNavigate('tours')}
          className="w-full flex items-center gap-3 px-6 py-3.5 text-left transition-colors"
          style={{ borderBottom: '1px solid var(--glass-border)' }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
        >
          {statusIcon(item.rider_status)}
          <div className="flex-1 min-w-0">
            <p className="text-[13.5px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {item.program_name}
            </p>
            <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
              {item.city || 'Город не указан'}
              {item.start_date && ` · ${new Date(item.start_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`}
            </p>
          </div>
          <span
            className="badge text-[11px]"
            style={item.rider_status === 'empty'
              ? { background: 'var(--error-muted)', color: 'var(--error)' }
              : { background: 'var(--warning-muted)', color: 'var(--warning)' }
            }
          >
            {item.rider_status === 'empty' ? 'Не заполнен' : 'Частично'}
          </span>
        </button>
      ))}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-dropdown px-3 py-2 rounded-xl" style={{ minWidth: 140 }}>
      {label && <p className="text-[11px] mb-1" style={{ color: 'var(--text-tertiary)' }}>{label}</p>}
      {payload.map(p => (
        <p key={p.name} className="text-[13px] font-medium" style={{ color: p.color }}>
          {p.name}: {p.value > 1000 ? `${p.value.toLocaleString('ru-RU')} ₽` : p.value}
        </p>
      ))}
    </div>
  );
};

const PIE_COLORS = ['#6366f1', '#34d399', '#fbbf24', '#f87171', '#60a5fa', '#a78bfa', '#fb923c'];

export default function Dashboard({ onNavigate }: { onNavigate?: (s: string) => void }) {
  const { isManager, isAdmin } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [financials, setFinancials] = useState<FinancialMonth[]>([]);
  const [riderItems, setRiderItems] = useState<RiderAttentionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const navigate = onNavigate ?? (() => {});

  const fetchAll = useCallback(async () => {
    try {
      const [s, f, r] = await Promise.all([
        dashboardApi.getStats(),
        (isManager || isAdmin) ? dashboardApi.getFinancials() : Promise.resolve([]),
        (isManager || isAdmin) ? dashboardApi.getRiderAttention() : Promise.resolve([]),
      ]);
      setStats(s);
      setFinancials(f);
      setRiderItems(r);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  }, [isManager, isAdmin]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const cards = stats ? [
    { label: 'Группы',      value: stats.bands,   icon: <Music2 className="w-5 h-5" />, color: '#6366f1', bg: 'rgba(99,102,241,0.12)', section: 'bands' },
    { label: 'Исполнители', value: stats.singers,  icon: <Mic2 className="w-5 h-5" />,   color: '#a78bfa', bg: 'rgba(167,139,250,0.1)',  section: 'singers' },
    { label: 'Песни',       value: stats.songs,    icon: <Radio className="w-5 h-5" />,   color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',   section: 'songs' },
    { label: 'Туры',        value: stats.tours,    icon: <MapPin className="w-5 h-5" />,  color: '#fb923c', bg: 'rgba(251,146,60,0.1)',   section: 'tours' },
  ] : [];

  const ratingData = stats?.topBands.filter(b => b.rating != null).map(b => ({
    name: b.name.length > 12 ? b.name.slice(0, 12) + '…' : b.name,
    рейтинг: b.rating,
  })) ?? [];

  const countryMap: Record<string, number> = {};
  stats?.topBands.forEach(b => { const c = b.country || 'Другие'; countryMap[c] = (countryMap[c] || 0) + 1; });
  const pieData = Object.entries(countryMap).map(([name, value]) => ({ name, value }));

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <div className="skeleton mb-2" style={{ width: 140, height: 28 }} />
          <div className="skeleton" style={{ width: 210, height: 16 }} />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6" style={{ borderColor: 'var(--error)' }}>
        <p className="text-[14px]" style={{ color: 'var(--error)' }}>Ошибка загрузки: {error}</p>
      </div>
    );
  }

  const showMessages = isManager || isAdmin;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Обзор</h1>
        <p className="text-[13.5px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Ваш музыкальный менеджмент в одном месте
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <StatCard
            key={c.label}
            {...c}
            delay={i * 60}
            onClick={() => navigate(c.section)}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ratingData.length > 0 && (
          <div className="glass-card p-5 animate-fade-in" style={{ animationDelay: '200ms' }}>
            <h3 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Рейтинг групп</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={ratingData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" horizontal={false} />
                <XAxis type="number" domain={[0,10]} tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-subtle)' }} />
                <defs>
                  <linearGradient id="rg" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#a78bfa" />
                  </linearGradient>
                </defs>
                <Bar dataKey="рейтинг" fill="url(#rg)" radius={[0,6,6,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {pieData.length > 0 && (
          <div className="glass-card p-5 animate-fade-in" style={{ animationDelay: '260ms' }}>
            <h3 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Распределение по странам</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0)*100).toFixed(0)}%`}
                  labelLine={false}>
                  {pieData.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="glass-card p-5 animate-fade-in" style={{ animationDelay: '300ms' }}>
          <h3 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Финансы по турам (₽)</h3>
          {financials.length === 0 ? (
            <div className="h-[180px] flex items-center justify-center">
              <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                Нет данных о доходах. Добавьте туры с гонорарами.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={financials} margin={{ left: -20, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}к`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-subtle)' }} />
                <Bar dataKey="доходы"  fill="#34d399" radius={[4,4,0,0]} />
                <Bar dataKey="расходы" fill="#f87171" radius={[4,4,0,0]} />
                <Bar dataKey="прибыль" fill="#6366f1" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-card p-5 animate-fade-in" style={{ animationDelay: '340ms' }}>
          <h3 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Туры по периодам</h3>
          {financials.length === 0 ? (
            <div className="h-[180px] flex items-center justify-center">
              <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Нет данных о турах</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={financials} margin={{ left: -20, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}к`} />
                <Tooltip content={<CustomTooltip />} />
                <defs>
                  <linearGradient id="lg" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#60a5fa" />
                  </linearGradient>
                </defs>
                <Line type="monotone" dataKey="прибыль" stroke="url(#lg)" strokeWidth={2.5} dot={{ fill: '#34d399', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {stats && stats.topBands.length > 0 && (
        <div className="glass-card overflow-hidden animate-fade-in" style={{ animationDelay: '380ms' }}>
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--glass-border)' }}>
            <div className="flex items-center gap-2.5">
              <TrendingUp className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Топ групп по рейтингу</h2>
            </div>
            <span className="badge" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
              Топ {stats.topBands.length}
            </span>
          </div>
          {stats.topBands.map((band, i) => (
            <div
              key={band.name}
              className="flex items-center gap-4 px-6 py-4 table-row-hover transition-colors"
              style={{ borderBottom: i < stats.topBands.length - 1 ? '1px solid var(--glass-border)' : 'none' }}
            >
              <span
                className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                style={{
                  background: i === 0 ? 'rgba(251,191,36,0.15)' : 'var(--bg-elevated)',
                  color: i === 0 ? 'var(--warning)' : 'var(--text-tertiary)',
                }}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{band.name}</p>
                <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{band.country || 'Страна не указана'}</p>
              </div>
              {band.rating != null && (
                <span className="badge flex items-center gap-1.5" style={{ background: 'rgba(251,191,36,0.1)', color: 'var(--warning)' }}>
                  <Star className="w-3 h-3 fill-current" />{band.rating}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {showMessages && <RecentMessagesWidget onNavigate={() => navigate('messages')} />}

      {showMessages && riderItems.length > 0 && (
        <RiderAttentionWidget items={riderItems} onNavigate={navigate} />
      )}
    </div>
  );
}
