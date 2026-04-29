import { useEffect, useState } from 'react';
import { supabase, Song } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { Plus, Pencil, Trash2, Radio } from 'lucide-react';

export default function Songs() {
  const { user } = useAuth();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editSong, setEditSong] = useState<Song | null>(null);
  const [form, setForm] = useState({ title: '', composer: '', lyricist: '', creation_year: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetch = async () => {
    const { data } = await supabase.from('song').select('*').order('title');
    setSongs(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const openAdd = () => {
    setEditSong(null);
    setForm({ title: '', composer: '', lyricist: '', creation_year: '' });
    setError('');
    setShowForm(true);
  };

  const openEdit = (s: Song) => {
    setEditSong(s);
    setForm({
      title: s.title,
      composer: s.composer,
      lyricist: s.lyricist,
      creation_year: s.creation_year?.toString() ?? '',
    });
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Название обязательно'); return; }
    setSaving(true);
    setError('');
    const payload = {
      title: form.title.trim(),
      composer: form.composer.trim(),
      lyricist: form.lyricist.trim(),
      creation_year: form.creation_year ? parseInt(form.creation_year) : null,
      created_by: user!.id,
    };
    if (editSong) {
      const { error } = await supabase.from('song').update(payload).eq('id', editSong.id);
      if (error) { setError(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from('song').insert(payload);
      if (error) { setError(error.message); setSaving(false); return; }
    }
    await fetch();
    setShowForm(false);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить песню?')) return;
    await supabase.from('song').delete().eq('id', id);
    await fetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Песни</h1>
          <p className="text-slate-500 text-sm mt-1">{songs.length} песен</p>
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
      ) : songs.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <p className="text-slate-500">Нет песен. Добавьте первую!</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left text-slate-500 font-medium px-5 py-3.5">Название</th>
                <th className="text-left text-slate-500 font-medium px-5 py-3.5 hidden md:table-cell">Композитор</th>
                <th className="text-left text-slate-500 font-medium px-5 py-3.5 hidden lg:table-cell">Поэт</th>
                <th className="text-left text-slate-500 font-medium px-5 py-3.5 hidden sm:table-cell">Год</th>
                <th className="px-5 py-3.5 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {songs.map(song => (
                <tr key={song.id} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Radio className="w-4 h-4 text-slate-500" />
                      </div>
                      <span className="text-white font-medium">{song.title}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-400 hidden md:table-cell">{song.composer || '—'}</td>
                  <td className="px-5 py-3.5 text-slate-400 hidden lg:table-cell">{song.lyricist || '—'}</td>
                  <td className="px-5 py-3.5 text-slate-400 hidden sm:table-cell">{song.creation_year ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    {song.created_by === user?.id && (
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(song)} className="p-1.5 text-slate-600 hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-all">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(song.id)} className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <Modal title={editSong ? 'Редактировать песню' : 'Новая песня'} onClose={() => setShowForm(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Название *</label>
              <input
                autoFocus
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 text-sm"
                value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Название песни"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Композитор</label>
                <input
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 text-sm"
                  value={form.composer} onChange={e => setForm({ ...form, composer: e.target.value })}
                  placeholder="Имя композитора"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Поэт</label>
                <input
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 text-sm"
                  value={form.lyricist} onChange={e => setForm({ ...form, lyricist: e.target.value })}
                  placeholder="Имя поэта"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Год создания</label>
              <input
                type="number" min="1900" max="2030"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 text-sm"
                value={form.creation_year} onChange={e => setForm({ ...form, creation_year: e.target.value })}
                placeholder="2020"
              />
            </div>
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
