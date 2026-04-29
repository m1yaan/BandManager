import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Music2, Mic2, Radio, MapPin, TrendingUp, Star } from 'lucide-react';

type Stats = {
  bands: number;
  singers: number;
  songs: number;
  tours: number;
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ bands: 0, singers: 0, songs: 0, tours: 0 });
  const [topBands, setTopBands] = useState<{ name: string; rating: number | null; country: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const [b, s, so, t, tb] = await Promise.all([
        supabase.from('band').select('id', { count: 'exact', head: true }),
        supabase.from('singer').select('id', { count: 'exact', head: true }),
        supabase.from('song').select('id', { count: 'exact', head: true }),
        supabase.from('tour').select('id', { count: 'exact', head: true }),
        supabase.from('band').select('name, rating, country').order('rating', { ascending: false }).limit(5),
      ]);
      setStats({
        bands: b.count ?? 0,
        singers: s.count ?? 0,
        songs: so.count ?? 0,
        tours: t.count ?? 0,
      });
      setTopBands(tb.data ?? []);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const cards = [
    { label: 'Группы', value: stats.bands, icon: <Music2 className="w-6 h-6" />, color: 'amber' },
    { label: 'Певцы', value: stats.singers, icon: <Mic2 className="w-6 h-6" />, color: 'sky' },
    { label: 'Песни', value: stats.songs, icon: <Radio className="w-6 h-6" />, color: 'emerald' },
    { label: 'Туры', value: stats.tours, icon: <MapPin className="w-6 h-6" />, color: 'rose' },
  ];

  const colorMap: Record<string, string> = {
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    sky: 'bg-sky-500/15 text-sky-400 border-sky-500/20',
    emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    rose: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
  };

  if (loading) return <div className="text-slate-500 text-sm">Загрузка...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Обзор</h1>
        <p className="text-slate-500 text-sm mt-1">Общая статистика системы</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(card => (
          <div key={card.label} className={`bg-slate-900 border rounded-2xl p-5 ${colorMap[card.color].split(' ').slice(2).join(' ')} border`}>
            <div className={`inline-flex p-2.5 rounded-xl mb-4 ${colorMap[card.color].split(' ').slice(0, 2).join(' ')}`}>
              {card.icon}
            </div>
            <p className="text-3xl font-bold text-white">{card.value}</p>
            <p className="text-slate-500 text-sm mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {topBands.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            <h2 className="text-white font-semibold">Топ групп по рейтингу</h2>
          </div>
          <div className="space-y-3">
            {topBands.map((band, i) => (
              <div key={band.name} className="flex items-center gap-4 py-2 border-b border-slate-800 last:border-0">
                <span className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs text-slate-400 font-medium flex-shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{band.name}</p>
                  <p className="text-slate-500 text-xs">{band.country || '—'}</p>
                </div>
                {band.rating != null && (
                  <div className="flex items-center gap-1 text-amber-400">
                    <Star className="w-4 h-4 fill-amber-400" />
                    <span className="text-sm font-semibold">{band.rating}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
