import { useEffect, useState } from 'react';
import { supabase, Tour, Band, Song } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { Plus, Pencil, Trash2, MapPin, Calendar, ChevronDown, ChevronUp, Music } from 'lucide-react';

type TourWithDetails = Tour & { band?: Band; tourSongs?: Song[] };

export default function Tours() {
  const { user } = useAuth();
  const [tours, setTours] = useState<TourWithDetails[]>([]);
  const [bands, setBands] = useState<Band[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTour, setEditTour] = useState<Tour | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    program_name: '', city: '', start_date: '', end_date: '',
    avg_ticket_price: '', band_id: '',
  });
  const [selectedSongs, setSelectedSongs] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchTours = async () => {
    const { data } = await supabase.from('tour').select('*, band(*)').order('start_date', { ascending: false });
    setTours((data ?? []).map((t: Tour & { band: Band }) => ({ ...t, band: t.band })));
    setLoading(false);
  };

  useEffect(() => {
    fetchTours();
    supabase.from('band').select('*').order('name').then(({ data }) => setBands(data ?? []));
    supabase.from('song').select('*').order('title').then(({ data }) => setSongs(data ?? []));
  }, []);

  const fetchTourDetails = async (tourId: string) => {
    const { data } = await supabase.from('tour_song').select('song_id').eq('tour_id', tourId);
    const songIds = (data ?? []).map((r: { song_id: string }) => r.song_id);
    const tourSongs = songs.filter(s => songIds.includes(s.id));
    setTours(prev => prev.map(t => t.id === tourId ? { ...t, tourSongs } : t));
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      fetchTourDetails(id);
    }
  };

  const openAdd = () => {
    setEditTour(null);
    setForm({ program_name: '', city: '', start_date: '', end_date: '', avg_ticket_price: '', band_id: bands[0]?.id ?? '' });
    setSelectedSongs([]);
    setError('');
    setShowForm(true);
  };

  const openEdit = async (tour: Tour) => {
    setEditTour(tour);
    setForm({
      program_name: tour.program_name,
      city: tour.city,
      start_date: tour.start_date ?? '',
      end_date: tour.end_date ?? '',
      avg_ticket_price: tour.avg_ticket_price?.toString() ?? '',
      band_id: tour.band_id,
    });
    const { data } = await supabase.from('tour_song').select('song_id').eq('tour_id', tour.id);
    setSelectedSongs((data ?? []).map((r: { song_id: string }) => r.song_id));
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.program_name.trim()) { setError('Название программы обязательно'); return; }
    if (!form.band_id) { setError('Выберите группу'); return; }
    setSaving(true);
    setError('');
    const payload = {
      program_name: form.program_name.trim(),
      city: form.city.trim(),
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      avg_ticket_price: form.avg_ticket_price ? parseFloat(form.avg_ticket_price) : 0,
      band_id: form.band_id,
      created_by: user!.id,
    };

    let tourId: string;
    if (editTour) {
      const { error } = await supabase.from('tour').update(payload).eq('id', editTour.id);
      if (error) { setError(error.message); setSaving(false); return; }
      tourId = editTour.id;
      await supabase.from('tour_song').delete().eq('tour_id', tourId);
    } else {
      const { data, error } = await supabase.from('tour').insert(payload).select().single();
      if (error || !data) { setError(error?.message ?? 'Ошибка'); setSaving(false); return; }
      tourId = data.id;
    }

    if (selectedSongs.length > 0) {
      await supabase.from('tour_song').insert(selectedSongs.map(sid => ({ tour_id: tourId, song_id: sid })));
    }

    await fetchTours();
    setShowForm(false);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить тур?')) return;
    await supabase.from('tour').delete().eq('id', id);
    await fetchTours();
  };

  const toggleSong = (id: string) => {
    setSelectedSongs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Туры</h1>
          <p className="text-slate-500 text-sm mt-1">{tours.length} туров</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all shadow-lg shadow-amber-500/20"
        >
          <Plus className="w-4 h-4" />
          Добавить
        </button>
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm">Загрузка...</div>
      ) : tours.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <p className="text-slate-500">Нет туров. Добавьте первый!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tours.map(tour => (
            <div key={tour.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="flex items-start gap-4 px-5 py-4">
                <div className="w-10 h-10 bg-rose-500/15 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="w-5 h-5 text-rose-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold">{tour.program_name}</h3>
                  <div className="flex flex-wrap gap-3 mt-1.5">
                    {tour.city && (
                      <span className="text-slate-500 text-xs flex items-center gap-1">
                        <MapPin className="w-3 h-3" />{tour.city}
                      </span>
                    )}
                    {(tour.start_date || tour.end_date) && (
                      <span className="text-slate-500 text-xs flex items-center gap-1">
                        <Calendar className="w-3 h-3" />{formatDate(tour.start_date)} — {formatDate(tour.end_date)}
                      </span>
                    )}
                    {tour.avg_ticket_price > 0 && (
                      <span className="text-emerald-400 text-xs font-medium">
                        {tour.avg_ticket_price.toLocaleString('ru-RU')} ₽
                      </span>
                    )}
                  </div>
                  {tour.band && (
                    <p className="text-slate-600 text-xs mt-1">{(tour.band as unknown as Band).name}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {tour.created_by === user?.id && (
                    <>
                      <button onClick={() => openEdit(tour)} className="p-2 text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-all">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(tour.id)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button onClick={() => toggleExpand(tour.id)} className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
                    {expandedId === tour.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {expandedId === tour.id && (
                <div className="border-t border-slate-800 px-5 py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Music className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-400 text-sm font-medium">Программа тура</span>
                  </div>
                  {tour.tourSongs && tour.tourSongs.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {tour.tourSongs.map(s => (
                        <span key={s.id} className="bg-slate-800 text-slate-300 text-xs px-3 py-1 rounded-full">{s.title}</span>
                      ))}
                    </div>
                  ) : <p className="text-slate-600 text-sm">Нет песен в программе</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal title={editTour ? 'Редактировать тур' : 'Новый тур'} onClose={() => setShowForm(false)} size="lg">
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Название программы *</label>
              <input
                autoFocus
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 text-sm"
                value={form.program_name} onChange={e => setForm({ ...form, program_name: e.target.value })}
                placeholder="Название тура"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Город</label>
                <input
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 text-sm"
                  value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}
                  placeholder="Москва"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Средняя цена билета (₽)</label>
                <input
                  type="number" min="0" step="100"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 text-sm"
                  value={form.avg_ticket_price} onChange={e => setForm({ ...form, avg_ticket_price: e.target.value })}
                  placeholder="2500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Дата начала</label>
                <input
                  type="date"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 text-sm"
                  value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Дата окончания</label>
                <input
                  type="date"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 text-sm"
                  value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Группа *</label>
              <select
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 text-sm"
                value={form.band_id} onChange={e => setForm({ ...form, band_id: e.target.value })}
              >
                <option value="">Выберите группу</option>
                {bands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            {songs.length > 0 && (
              <div>
                <label className="block text-sm text-slate-400 mb-2">Программа (песни)</label>
                <div className="max-h-40 overflow-y-auto bg-slate-800/50 border border-slate-700 rounded-xl p-3 space-y-1">
                  {songs.map(s => (
                    <label key={s.id} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-slate-700/50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSongs.includes(s.id)}
                        onChange={() => toggleSong(s.id)}
                        className="accent-amber-500"
                      />
                      <span className="text-slate-300 text-sm">{s.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-sm transition-all">
                Отмена
              </button>
              <button
                onClick={handleSave} disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-sm font-medium transition-all disabled:opacity-50"
              >
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
