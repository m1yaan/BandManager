import { useEffect, useState } from 'react';
import { supabase, Singer } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { Plus, Pencil, Trash2, Mic2 } from 'lucide-react';

export default function Singers() {
  const { user } = useAuth();
  const [singers, setSingers] = useState<Singer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editSinger, setEditSinger] = useState<Singer | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetch = async () => {
    const { data } = await supabase.from('singer').select('*').order('name');
    setSingers(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const openAdd = () => {
    setEditSinger(null);
    setName('');
    setError('');
    setShowForm(true);
  };

  const openEdit = (s: Singer) => {
    setEditSinger(s);
    setName(s.name);
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('Имя обязательно'); return; }
    setSaving(true);
    setError('');
    if (editSinger) {
      const { error } = await supabase.from('singer').update({ name: name.trim() }).eq('id', editSinger.id);
      if (error) { setError(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from('singer').insert({ name: name.trim(), created_by: user!.id });
      if (error) { setError(error.message); setSaving(false); return; }
    }
    await fetch();
    setShowForm(false);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить певца?')) return;
    await supabase.from('singer').delete().eq('id', id);
    await fetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Певцы</h1>
          <p className="text-slate-500 text-sm mt-1">{singers.length} исполнителей</p>
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
      ) : singers.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <p className="text-slate-500">Нет певцов. Добавьте первого!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {singers.map(singer => (
            <div key={singer.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4 hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center flex-shrink-0">
                <Mic2 className="w-5 h-5 text-slate-500" />
              </div>
              <span className="text-white font-medium flex-1 min-w-0 truncate">{singer.name}</span>
              {singer.created_by === user?.id && (
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(singer)} className="p-1.5 text-slate-600 hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-all">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(singer.id)} className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal title={editSinger ? 'Редактировать певца' : 'Новый певец'} onClose={() => setShowForm(false)} size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Имя *</label>
              <input
                autoFocus
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 text-sm"
                value={name} onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                placeholder="Имя исполнителя"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex justify-end gap-3">
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
