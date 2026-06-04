import { useEffect, useState, useCallback } from 'react';
import { songsApi, Song } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { Tooltip } from '../components/Tooltip';
import { SkeletonTableRow } from '../components/Skeleton';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Plus, Pencil, Trash2, Radio } from 'lucide-react';
import { toast } from 'sonner';

export default function Songs() {
  const { user } = useAuth();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editSong, setEditSong] = useState<Song | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Song | null>(null);
  const [form, setForm] = useState({ title: '', composer: '', lyricist: '', creation_year: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    try { setSongs(await songsApi.getAll()); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openAdd = () => {
    setEditSong(null);
    setForm({ title: '', composer: '', lyricist: '', creation_year: '' });
    setError(''); setShowForm(true);
  };

  const openEdit = (s: Song) => {
    setEditSong(s);
    setForm({ title: s.title, composer: s.composer, lyricist: s.lyricist, creation_year: s.creation_year?.toString() ?? '' });
    setError(''); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Название обязательно'); return; }
    setSaving(true); setError('');
    const payload = {
      title: form.title.trim(),
      composer: form.composer.trim(),
      lyricist: form.lyricist.trim(),
      creation_year: form.creation_year ? parseInt(form.creation_year) : null,
    };
    try {
      if (editSong) {
        await songsApi.update(editSong.id, payload);
        toast.success('Песня обновлена');
      } else {
        await songsApi.create(payload);
        toast.success('Песня добавлена');
      }
      await fetchAll(); setShowForm(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка сохранения';
      setError(msg); toast.error(msg);
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await songsApi.delete(deleteTarget.id);
      toast.success('Песня удалена');
      await fetchAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка удаления');
    } finally { setDeleteTarget(null); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Песни</h1>
          <p className="text-[13.5px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {songs.length} {songs.length === 1 ? 'песня' : songs.length < 5 ? 'песни' : 'песен'}
          </p>
        </div>
        <button onClick={openAdd} className="btn btn-primary">
          <Plus className="w-4 h-4" /> Добавить
        </button>
      </div>

      {songs.length === 0 && !loading ? (
        <EmptyState
          icon={<Radio className="w-5 h-5" />}
          title="Нет песен"
          description="Добавьте первую песню в библиотеку"
          action={<button onClick={openAdd} className="btn btn-primary"><Plus className="w-4 h-4" /> Добавить</button>}
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {[
                  { label: 'Название', cls: '' },
                  { label: 'Композитор', cls: 'hidden md:table-cell' },
                  { label: 'Поэт', cls: 'hidden lg:table-cell' },
                  { label: 'Год', cls: 'hidden sm:table-cell' },
                  { label: '', cls: '' },
                ].map(({ label, cls }, i) => (
                  <th key={i} className={`text-left px-5 py-3.5 text-[11.5px] font-semibold uppercase tracking-wider ${cls}`} style={{ color: 'var(--text-tertiary)' }}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <SkeletonTableRow key={i} cols={5} />)
                : songs.map(song => (
                  <tr key={song.id} className="table-row-hover transition-colors group" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa' }}>
                          <Radio className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-medium text-[14px]" style={{ color: 'var(--text-primary)' }}>{song.title}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>
                      {song.composer || <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>
                      {song.lyricist || <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>
                      {song.creation_year ?? <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                    </td>
                    <td className="px-5 py-4">
                      {song.created_by === user?.id && (
                        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <Tooltip label="Редактировать">
                            <button onClick={() => openEdit(song)} className="btn btn-ghost btn-icon" style={{ color: 'var(--text-tertiary)' }}>
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </Tooltip>
                          <Tooltip label="Удалить">
                            <button onClick={() => setDeleteTarget(song)} className="btn btn-ghost btn-icon" style={{ color: 'var(--text-tertiary)' }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </Tooltip>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <Modal
          title={editSong ? 'Редактировать песню' : 'Новая песня'}
          subtitle={editSong ? `Редактирование: «${editSong.title}»` : 'Добавить песню в библиотеку'}
          onClose={() => setShowForm(false)}
          footer={
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="btn btn-ghost">Отмена</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                {saving ? 'Сохранение...' : editSong ? 'Сохранить' : 'Добавить'}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Название *</label>
              <input autoFocus className="input-base" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Название песни" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Композитор</label>
                <input className="input-base" value={form.composer} onChange={e => setForm({ ...form, composer: e.target.value })} placeholder="Имя композитора" />
              </div>
              <div>
                <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Поэт</label>
                <input className="input-base" value={form.lyricist} onChange={e => setForm({ ...form, lyricist: e.target.value })} placeholder="Имя поэта" />
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Год создания</label>
              <input type="number" min="1900" max="2030" className="input-base" value={form.creation_year} onChange={e => setForm({ ...form, creation_year: e.target.value })} placeholder="2020" />
            </div>
            {error && <p className="text-[13px]" style={{ color: 'var(--error)' }}>{error}</p>}
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Удалить песню?"
          description={`Вы уверены, что хотите удалить песню «${deleteTarget.title}»? Это действие необратимо.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}