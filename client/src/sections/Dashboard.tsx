import { useEffect, useState, memo, useCallback } from 'react';
import { dashboardApi, DashboardStats, bandsApi, toursApi } from '../lib/api';
import {
  Music2, Mic2, Radio, MapPin, TrendingUp, Star, ArrowUpRight,
  Sparkles, CheckCircle2, XCircle, Bookmark, Clock, ChevronDown, ChevronUp, History, Loader2,
} from 'lucide-react';
import { SkeletonCard } from '../components/Skeleton';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { toast } from 'sonner';

// ── Стат-карточка ──────────────────────────────────────────────────────────────
type StatCardProps = {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bg: string;
  delay?: number;
};

const StatCard = memo(({ label, value, icon, color, bg, delay = 0 }: StatCardProps) => (
  <div className="card card-hover p-6 animate-fade-in" style={{ animationDelay: `${delay}ms` }}>
    <div className="flex items-start justify-between mb-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg, color }}>
        {icon}
      </div>
      <ArrowUpRight className="w-4 h-4 opacity-25" style={{ color: 'var(--text-tertiary)' }} />
    </div>
    <p className="text-[30px] font-bold tracking-tight leading-none mb-1" style={{ color: 'var(--text-primary)' }}>
      {value.toLocaleString()}
    </p>
    <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{label}</p>
  </div>
));
StatCard.displayName = 'StatCard';

// ── Входящие предложения ────────────────────────────────────────────────────────
type OfferType = 'Клуб' | 'Фестиваль' | 'Корпоратив' | 'Мини-тур' | 'Благотворительный концерт';

type IncomingOffer = {
  id: string;
  type: OfferType;
  title: string;
  city: string;
  date: string;
  start_date: string;
  fee: number;
  avg_ticket_price: number;
  status: 'new' | 'saved';
};

type HistoryOffer = Omit<IncomingOffer, 'status'> & {
  status: 'accepted' | 'rejected';
  resolvedAt: number;
};

const OFFER_TYPES: OfferType[] = ['Клуб', 'Фестиваль', 'Корпоратив', 'Мини-тур', 'Благотворительный концерт'];

const CITIES = [
  'Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань', 'Сочи', 'Минск',
  'Краснодар', 'Владивосток', 'Самара', 'Ростов-на-Дону', 'Тбилиси', 'Алматы', 'Баку',
];

const TITLES_BY_TYPE: Record<OfferType, string[]> = {
  'Клуб': ['Ночной сет', 'Weekend Party', 'Акустический вечер', 'DJ + Live', 'Закрытый клуб'],
  'Фестиваль': ['Фест «Дикая мята»', 'Park Live Stage', 'VK Fest', 'Летний Open Air', 'Urban Fest'],
  'Корпоратив': ['Корпоратив ВТБ', 'Новый год в офисе', 'Юбилей компании', 'Team Building Live', 'Private Event'],
  'Мини-тур': ['3 города за неделю', 'Гастроли выходного дня', 'Маршрут «Золотое кольцо»', 'Южный мини-тур', 'Два дня — два города'],
  'Благотворительный концерт': ['Детский дом', 'Сбор для фонда', 'Благотворительный вечер', 'Концерт надежды', 'Live for Good'],
};

const FEE_RANGES: Record<OfferType, [number, number]> = {
  'Клуб': [80, 350],
  'Фестиваль': [400, 1200],
  'Корпоратив': [250, 800],
  'Мини-тур': [500, 1500],
  'Благотворительный концерт': [50, 200],
};

const TICKET_RANGES: Record<OfferType, [number, number]> = {
  'Клуб': [800, 3500],
  'Фестиваль': [1500, 6000],
  'Корпоратив': [0, 0],
  'Мини-тур': [1200, 4500],
  'Благотворительный концерт': [300, 1500],
};

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateOffer(): IncomingOffer {
  const type = OFFER_TYPES[Math.floor(Math.random() * OFFER_TYPES.length)];
  const titles = TITLES_BY_TYPE[type];
  const title = titles[Math.floor(Math.random() * titles.length)];
  const city = CITIES[Math.floor(Math.random() * CITIES.length)];
  const daysAhead = randomInt(7, 180);
  const start = new Date(Date.now() + daysAhead * 86400000);
  const start_date = start.toISOString().slice(0, 10);
  const date = start.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  const [feeMin, feeMax] = FEE_RANGES[type];
  const fee = randomInt(feeMin, feeMax) * 1000;
  const [tMin, tMax] = TICKET_RANGES[type];
  const avg_ticket_price = type === 'Корпоратив' ? 0 : randomInt(tMin, tMax);
  return {
    id: Math.random().toString(36).slice(2),
    type, title, city, date, start_date, fee, avg_ticket_price, status: 'new',
  };
}

const EXIT_MS = 280;

// ── Цвета для pie chart ────────────────────────────────────────────────────────
const PIE_COLORS = ['#6366f1', '#34d399', '#fbbf24', '#f87171', '#60a5fa', '#a78bfa', '#fb923c'];

// ── Моковые данные для графиков ────────────────────────────────────────────────
const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн'];
const toursByMonth = MONTHS.map((m, i) => ({ month: m, туры: Math.floor(Math.random() * 8) + 1 + i }));
const financeByMonth = MONTHS.map(m => ({
  month: m,
  доходы: Math.floor(Math.random() * 800000) + 200000,
  расходы: Math.floor(Math.random() * 400000) + 100000,
})).map(d => ({ ...d, прибыль: d.доходы - d.расходы }));

// ── Компонент графика-скелетона ────────────────────────────────────────────────
const ChartSkeleton = () => (
  <div className="card p-5">
    <div className="skeleton mb-4" style={{ width: 160, height: 20 }} />
    <div className="skeleton w-full" style={{ height: 180 }} />
  </div>
);

// ── Кастомный тултип для recharts ──────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2" style={{ minWidth: 140 }}>
      {label && <p className="text-[12px] mb-1" style={{ color: 'var(--text-tertiary)' }}>{label}</p>}
      {payload.map(p => (
        <p key={p.name} className="text-[13px] font-medium" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' && p.value > 1000
            ? p.value.toLocaleString('ru-RU') + ' ₽'
            : p.value}
        </p>
      ))}
    </div>
  );
};

type DashboardProps = {
  onNavigateToTours?: () => void;
};

// ── Основной Dashboard ─────────────────────────────────────────────────────────
export default function Dashboard({ onNavigateToTours }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offers, setOffers] = useState<IncomingOffer[]>([]);
  const [history, setHistory] = useState<HistoryOffer[]>([]);
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    dashboardApi.getStats()
      .then(setStats)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const removeFromActive = useCallback((offer: IncomingOffer, outcome: 'accepted' | 'rejected') => {
    setExitingIds(prev => new Set(prev).add(offer.id));
    setTimeout(() => {
      setOffers(prev => prev.filter(o => o.id !== offer.id));
      setHistory(prev => [{
        ...offer,
        status: outcome,
        resolvedAt: Date.now(),
      }, ...prev]);
      setExitingIds(prev => {
        const next = new Set(prev);
        next.delete(offer.id);
        return next;
      });
    }, EXIT_MS);
  }, []);

  const handleGenerate = () => {
    setOffers(prev => [...prev.filter(o => o.status === 'saved'), generateOffer()]);
  };

  const handleSave = (offer: IncomingOffer) => {
    if (offer.status === 'saved') return;
    setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, status: 'saved' as const } : o));
    toast('Запрос сохранён', { icon: <Bookmark className="w-4 h-4" style={{ color: 'var(--warning)' }} /> });
  };

  const handleReject = (offer: IncomingOffer) => {
    removeFromActive(offer, 'rejected');
    toast('Запрос отклонён');
  };

  const handleAccept = async (offer: IncomingOffer) => {
    if (acceptingId) return;
    setAcceptingId(offer.id);
    try {
      const bands = await bandsApi.getAll();
      if (!bands.length) {
        toast.error('Сначала создайте хотя бы одну группу');
        return;
      }
      const band = bands[Math.floor(Math.random() * bands.length)];
      await toursApi.create({
        program_name: offer.title,
        city: offer.city,
        start_date: offer.start_date,
        avg_ticket_price: offer.avg_ticket_price,
        band_id: band.id,
      });
      removeFromActive(offer, 'accepted');
      toast.success('Тур создан!', {
        action: onNavigateToTours
          ? { label: 'Перейти', onClick: onNavigateToTours }
          : undefined,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось создать тур');
    } finally {
      setAcceptingId(null);
    }
  };

  const cards = stats ? [
    { label: 'Группы',       value: stats.bands,   icon: <Music2 className="w-5 h-5" />, color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
    { label: 'Исполнители',  value: stats.singers, icon: <Mic2 className="w-5 h-5" />,   color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
    { label: 'Песни',        value: stats.songs,   icon: <Radio className="w-5 h-5" />,  color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
    { label: 'Туры',         value: stats.tours,   icon: <MapPin className="w-5 h-5" />, color: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
  ] : [];

  const ratingData = stats?.topBands.filter(b => b.rating != null).map(b => ({
    name: b.name.length > 12 ? b.name.slice(0, 12) + '…' : b.name,
    рейтинг: b.rating,
  })) ?? [];

  const countryMap: Record<string, number> = {};
  stats?.topBands.forEach(b => {
    const c = b.country || 'Другие';
    countryMap[c] = (countryMap[c] || 0) + 1;
  });
  const pieData = Object.entries(countryMap).map(([name, value]) => ({ name, value }));

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <div className="skeleton mb-2" style={{ width: 140, height: 28 }} />
          <div className="skeleton" style={{ width: 200, height: 16 }} />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <ChartSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6" style={{ borderColor: 'var(--error)', background: 'var(--error-muted)' }}>
        <p className="text-[14px]" style={{ color: 'var(--error)' }}>Ошибка загрузки: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Обзор</h1>
        <p className="text-[13.5px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Ваш музыкальный менеджмент в одном месте
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => <StatCard key={card.label} {...card} delay={i * 60} />)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ratingData.length > 0 && (
          <div className="card p-5 animate-fade-in" style={{ animationDelay: '200ms' }}>
            <h3 className="text-[14px] font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <TrendingUp className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              Рейтинг групп
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={ratingData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                <XAxis type="number" domain={[0, 10]} tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-subtle)' }} />
                <defs>
                  <linearGradient id="ratingGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#a78bfa" />
                  </linearGradient>
                </defs>
                <Bar dataKey="рейтинг" fill="url(#ratingGrad)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {pieData.length > 0 && (
          <div className="card p-5 animate-fade-in" style={{ animationDelay: '260ms' }}>
            <h3 className="text-[14px] font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <MapPin className="w-4 h-4" style={{ color: '#fb923c' }} />
              Распределение по странам
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="card p-5 animate-fade-in" style={{ animationDelay: '300ms' }}>
          <h3 className="text-[14px] font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <MapPin className="w-4 h-4" style={{ color: '#34d399' }} />
            Туры по месяцам
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={toursByMonth} margin={{ left: -20, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#60a5fa" />
                </linearGradient>
              </defs>
              <Line type="monotone" dataKey="туры" stroke="url(#lineGrad)" strokeWidth={2.5} dot={{ fill: '#34d399', r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5 animate-fade-in" style={{ animationDelay: '340ms' }}>
          <h3 className="text-[14px] font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <ArrowUpRight className="w-4 h-4" style={{ color: '#fbbf24' }} />
            Финансы (₽)
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={financeByMonth} margin={{ left: -20, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}к`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-subtle)' }} />
              <Bar dataKey="доходы" fill="#34d399" radius={[4, 4, 0, 0]} />
              <Bar dataKey="расходы" fill="#f87171" radius={[4, 4, 0, 0]} />
              <Bar dataKey="прибыль" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {stats && stats.topBands.length > 0 && (
        <div className="card overflow-hidden animate-fade-in" style={{ animationDelay: '380ms' }}>
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center gap-2.5">
              <TrendingUp className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Топ групп по рейтингу</h2>
            </div>
            <span className="badge" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
              Топ {stats.topBands.length}
            </span>
          </div>
          <div>
            {stats.topBands.map((band, i) => (
              <div
                key={band.name}
                className="flex items-center gap-4 px-6 py-4 table-row-hover transition-colors animate-fade-in"
                style={{
                  borderBottom: i < stats.topBands.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  animationDelay: `${400 + i * 50}ms`,
                }}
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
        </div>
      )}

      {/* Входящие предложения */}
      <div className="card overflow-hidden animate-fade-in" style={{ animationDelay: '440ms' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2.5">
            <div className="pulse-dot" />
            <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Входящие предложения</h2>
          </div>
          <button
            onClick={handleGenerate}
            className="btn btn-primary text-[12px] py-1.5 px-3 gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Сгенерировать запрос
          </button>
        </div>

        {offers.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
              Нажмите «Сгенерировать запрос», чтобы получить входящее предложение
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {offers.map(offer => {
              const isExiting = exitingIds.has(offer.id);
              const isAccepting = acceptingId === offer.id;
              const showActions = offer.status === 'new' || offer.status === 'saved';
              return (
                <div
                  key={offer.id}
                  className={`flex items-start gap-4 px-6 py-4 table-row-hover transition-colors ${isExiting ? 'animate-fade-out' : 'animate-fade-in'}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="badge text-[11px]" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                        {offer.type}
                      </span>
                      {offer.status === 'saved' && (
                        <span className="badge flex items-center gap-1" style={{ background: 'var(--warning-muted)', color: 'var(--warning)' }}>
                          <Bookmark className="w-3 h-3 fill-current" />
                          Сохранён
                        </span>
                      )}
                    </div>
                    <p className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>{offer.title}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-[12px] flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                        <MapPin className="w-3 h-3" />{offer.city}
                      </span>
                      <span className="text-[12px] flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                        <Clock className="w-3 h-3" />{offer.date}
                      </span>
                      <span className="text-[12px] font-medium" style={{ color: 'var(--success)' }}>
                        {offer.fee.toLocaleString('ru-RU')} ₽
                      </span>
                      {offer.avg_ticket_price > 0 && (
                        <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                          билет от {offer.avg_ticket_price.toLocaleString('ru-RU')} ₽
                        </span>
                      )}
                    </div>
                  </div>
                  {showActions && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleAccept(offer)}
                        disabled={isAccepting || !!acceptingId}
                        className="btn btn-ghost btn-icon"
                        title="Принять"
                      >
                        {isAccepting
                          ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--success)' }} />
                          : <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--success)' }} />}
                      </button>
                      {offer.status === 'new' && (
                        <button
                          onClick={() => handleSave(offer)}
                          className="btn btn-ghost btn-icon"
                          title="Сохранить"
                        >
                          <Bookmark className="w-4 h-4" style={{ color: 'var(--warning)' }} />
                        </button>
                      )}
                      <button
                        onClick={() => handleReject(offer)}
                        disabled={isAccepting}
                        className="btn btn-ghost btn-icon"
                        title="Отклонить"
                      >
                        <XCircle className="w-4 h-4" style={{ color: 'var(--error)' }} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* История запросов */}
        {history.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <button
              type="button"
              onClick={() => setHistoryOpen(v => !v)}
              className="w-full flex items-center justify-between px-6 py-3 table-row-hover transition-colors"
            >
              <span className="text-[13px] font-medium flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                <History className="w-4 h-4" />
                История запросов
                <span className="badge text-[11px]" style={{ background: 'var(--bg-elevated)', color: 'var(--text-tertiary)' }}>
                  {history.length}
                </span>
              </span>
              {historyOpen
                ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                : <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />}
            </button>
            {historyOpen && (
              <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {history.map(entry => (
                  <div key={`${entry.id}-${entry.resolvedAt}`} className="flex items-start gap-4 px-6 py-3 opacity-90">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="badge text-[11px]" style={{ background: 'var(--bg-elevated)', color: 'var(--text-tertiary)' }}>
                          {entry.type}
                        </span>
                        {entry.status === 'accepted' ? (
                          <span className="badge flex items-center gap-1 text-[11px]" style={{ background: 'var(--success-muted)', color: 'var(--success)' }}>
                            <CheckCircle2 className="w-3 h-3" />
                            Принят
                          </span>
                        ) : (
                          <span className="badge flex items-center gap-1 text-[11px]" style={{ background: 'var(--error-muted)', color: 'var(--error)' }}>
                            <XCircle className="w-3 h-3" />
                            Отклонён
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{entry.title}</p>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="text-[11px] flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                          <MapPin className="w-3 h-3" />{entry.city}
                        </span>
                        <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{entry.date}</span>
                        <span className="text-[11px] font-medium" style={{ color: 'var(--success)' }}>
                          {entry.fee.toLocaleString('ru-RU')} ₽
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
