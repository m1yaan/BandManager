import { useEffect, useState } from 'react';
import { supabase, Band, Singer, Song } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { Plus, Pencil, Trash2, Star, Users, Music, ChevronDown, ChevronUp } from 'lucide-react';

type BandWithDetails = Band & {
  members?: Singer[];
  repertoire?: Song[];
};

export default function Bands() {
  const { user } = useAuth();
  const [bands, setBands] = useState<BandWithDetails[]>([]);
  const [singers, setSingers] = useState<Singer[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editBand, setEditBand] = useState<Band | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', foundation_year: '', country: '', rating: '' });
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedRepertoire, setSelectedRepertoire] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchBands = async () => {
    const { data } = await supabase.from('band').select('*').order('name');
    setBands(data ?? []);
    setLoading(false);
  };

  const fetchSingersAndSongs = async () => {
    const [{ data: s }, { data: so }] = await Promise.all([
      supabase.from('singer').select('*').order('name'),
      supabase.from('song').select('*').order('title'),
    ]);
    setSingers(s ?? []);
    setSongs(so ?? []);
  };

  useEffect(() => {
    fetchBands();
    fetchSingersAndSongs();
  }, []);

  const fetchDetails = async (bandId: string) => {
    const [{ data: members }, { data: rep }] = await Promise.all([
      supabase.from('band_member').select('singer_id').eq('band_id', bandId),
      supabase.from('repertoire').select('song_id').eq('band_id', bandId),
    ]);
    const memberIds = (members ?? []).map((m: { singer_id: string }) => m.singer_id);
    const songIds = (rep ?? []).map((r: { song_id: string }) => r.song_id);
    const memberData = singers.filter(s => memberIds.includes(s.id));
    const songData = songs.filter(s => songIds.includes(s.id));
    setBands(prev => prev.map(b => b.id === bandId ? { ...b, members: memberData, repertoire: songData } : b));
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      fetchDetails(id);
    }
  };

  const openAdd = () => {
    setEditBand(null);
    setForm({ name: '', foundation_year: '', country: '', rating: '' });
    setSelectedMembers([]);
    setSelectedRepertoire([]);
    setError('');
    setShowForm(true);
  };

  const openEdit = async (band: Band) => {
    setEditBand(band);
    setForm({
      name: band.name,
      foundation_year: band.foundation_year?.toString() ?? '',
      country: band.country,
      rating: band.rating?.toString() ?? '',
    });
    const [{ data: members }, { data: rep }] = await Promise.all([
      supabase.from('band_member').select('singer_id').eq('band_id', band.id),
      supabase.from('repertoire').select('song_id').eq('band_id', band.id),
    ]);
    setSelectedMembers((members ?? []).map((m: { singer_id: string }) => m.singer_id));
    setSelectedRepertoire((rep ?? []).map((r: { song_id: string }) => r.song_id));
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Название обязательно'); return; }
    setSaving(true);
    setError('');
    const payload = {
      name: form.name.trim(),
      foundation_year: form.foundation_year ? parseInt(form.foundation_year) : null,
      country: form.country.trim(),
      rating: form.rating ? parseFloat(form.rating) : null,
      created_by: user!.id,
    };

    let bandId: string;
    if (editBand) {
      const { error } = await supabase.from('band').update(payload).eq('id', editBand.id);
      if (error) { setError(error.message); setSaving(false); return; }
      bandId = editBand.id;
      await supabase.from('band_member').delete().eq('band_id', bandId);
      await supabase.from('repertoire').delete().eq('band_id', bandId);
    } else {
      const { data, error } = await supabase.from('band').insert(payload).select().single();
      if (error || !data) { setError(error?.message ?? 'Ошибка'); setSaving(false); return; }
      bandId = data.id;
    }

    if (selectedMembers.length > 0) {
      await supabase.from('band_member').insert(selectedMembers.map(sid => ({ band_id: bandId, singer_id: sid })));
    }
    if (selectedRepertoire.length > 0) {
      await supabase.from('repertoire').insert(selectedRepertoire.map(sid => ({ band_id: bandId, song_id: sid })));
    }

    await fetchBands();
    setShowForm(false);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить группу?')) return;
    await supabase.from('band').delete().eq('id', id);
    await fetchBands();
  };

  const toggleSelect = (id: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Группы</h1>
          <p className="text-slate-500 text-sm mt-1">{bands.length} групп в системе</p>
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
      ) : bands.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <p className="text-slate-500">Нет групп. Добавьте первую!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bands.map(band => (
            <div key={band.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="text-white font-semibold truncate">{band.name}</h3>
                    {band.rating != null && (
                      <span className="flex items-center gap-1 text-amber-400 text-xs font-medium">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />{band.rating}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 text-sm mt-0.5">
                    {[band.country, band.foundation_year].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {band.created_by === user?.id && (
                    <>
                      <button onClick={() => openEdit(band)} className="p-2 text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-all">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(band.id)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button onClick={() => toggleExpand(band.id)} className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
                    {expandedId === band.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {expandedId === band.id && (
                <div className="border-t border-slate-800 px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-400 text-sm font-medium">Участники</span>
                    </div>
                    {band.members && band.members.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {band.members.map(m => (
                          <span key={m.id} className="bg-slate-800 text-slate-300 text-xs px-3 py-1 rounded-full">{m.name}</span>
                        ))}
                      </div>
                    ) : <p className="text-slate-600 text-sm">Нет участников</p>}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Music className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-400 text-sm font-medium">Репертуар</span>
                    </div>
                    {band.repertoire && band.repertoire.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {band.repertoire.map(s => (
                          <span key={s.id} className="bg-slate-800 text-slate-300 text-xs px-3 py-1 rounded-full">{s.title}</span>
                        ))}
                      </div>
                    ) : <p className="text-slate-600 text-sm">Нет песен</p>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal title={editBand ? 'Редактировать группу' : 'Новая группа'} onClose={() => setShowForm(false)} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm text-slate-400 mb-1.5">Название *</label>
                <input
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 text-sm"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Название группы"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Год основания</label>
                <input
                  type="number" min="1900" max="2030"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 text-sm"
                  value={form.foundation_year} onChange={e => setForm({ ...form, foundation_year: e.target.value })}
                  placeholder="2000"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Страна</label>
                <input
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 text-sm"
                  value={form.country} onChange={e => setForm({ ...form, country: e.target.value })}
                  placeholder="Россия"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Рейтинг (1-10)</label>
                <input
                  type="number" min="1" max="10" step="0.1"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 text-sm"
                  value={form.rating} onChange={e => setForm({ ...form, rating: e.target.value })}
                  placeholder="8.5"
                />
              </div>
            </div>

            {singers.length > 0 && (
              <div>
                <label className="block text-sm text-slate-400 mb-2">Участники</label>
                <div className="max-h-40 overflow-y-auto bg-slate-800/50 border border-slate-700 rounded-xl p-3 space-y-1">
                  {singers.map(s => (
                    <label key={s.id} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-slate-700/50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(s.id)}
                        onChange={() => toggleSelect(s.id, selectedMembers, setSelectedMembers)}
                        className="accent-amber-500"
                      />
                      <span className="text-slate-300 text-sm">{s.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {songs.length > 0 && (
              <div>
                <label className="block text-sm text-slate-400 mb-2">Репертуар</label>
                <div className="max-h-40 overflow-y-auto bg-slate-800/50 border border-slate-700 rounded-xl p-3 space-y-1">
                  {songs.map(s => (
                    <label key={s.id} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-slate-700/50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedRepertoire.includes(s.id)}
                        onChange={() => toggleSelect(s.id, selectedRepertoire, setSelectedRepertoire)}
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
