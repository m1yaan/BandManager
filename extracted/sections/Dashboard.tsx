import { useEffect, useState, memo } from 'react';
import { dashboardApi, DashboardStats } from '../lib/api';
import { Music2, Mic2, Radio, MapPin, TrendingUp, Star, ArrowUpRight } from 'lucide-react';
import { SkeletonCard } from '../components/Skeleton';

type StatCardProps = {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bg: string;
  delay?: number;
};

const StatCard = memo(({ label, value, icon, color, bg, delay = 0 }: StatCardProps) => (
  <div
    className="card card-hover p-6 animate-fade-in"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="flex items-start justify-between mb-4">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: bg, color }}
      >
        {icon}
      </div>
      <ArrowUpRight className="w-4 h-4 opacity-25" style={{ color: 'var(--text-tertiary)' }} />
    </div>
    <p
      className="text-[30px] font-bold tracking-tight leading-none mb-1"
      style={{ color: 'var(--text-primary)' }}
    >
      {value.toLocaleString()}
    </p>
    <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{label}</p>
  </div>
));

StatCard.displayName = 'StatCard';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    dashboardApi.getStats()
      .then(setStats)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const cards = stats ? [
    { label: 'Bands',   value: stats.bands,   icon: <Music2 className="w-5 h-5" />, color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
    { label: 'Artists', value: stats.singers, icon: <Mic2 className="w-5 h-5" />,   color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
    { label: 'Songs',   value: stats.songs,   icon: <Radio className="w-5 h-5" />,  color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
    { label: 'Tours',   value: stats.tours,   icon: <MapPin className="w-5 h-5" />, color: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
  ] : [];

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <div className="skeleton mb-2" style={{ width: 140, height: 28 }} />
          <div className="skeleton" style={{ width: 200, height: 16 }} />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="card p-6"
        style={{ borderColor: 'var(--error)', background: 'var(--error-muted)' }}
      >
        <p className="text-[14px]" style={{ color: 'var(--error)' }}>
          Failed to load: {error}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Overview
        </h1>
        <p className="text-[13.5px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Your music management at a glance
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <StatCard key={card.label} {...card} delay={i * 60} />
        ))}
      </div>

      {stats && stats.topBands.length > 0 && (
        <div className="card overflow-hidden animate-fade-in" style={{ animationDelay: '240ms' }}>
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <div className="flex items-center gap-2.5">
              <TrendingUp className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                Top Bands by Rating
              </h2>
            </div>
            <span
              className="badge"
              style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}
            >
              Top {stats.topBands.length}
            </span>
          </div>

          <div>
            {stats.topBands.map((band, i) => (
              <div
                key={band.name}
                className="flex items-center gap-4 px-6 py-4 table-row-hover transition-colors"
                style={{ borderBottom: i < stats.topBands.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
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
                  <p
                    className="text-[14px] font-medium truncate"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {band.name}
                  </p>
                  <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                    {band.country || 'Unknown country'}
                  </p>
                </div>
                {band.rating != null && (
                  <span
                    className="badge flex items-center gap-1.5"
                    style={{ background: 'rgba(251,191,36,0.1)', color: 'var(--warning)' }}
                  >
                    <Star className="w-3 h-3 fill-current" />
                    {band.rating}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
