import { useEffect, useState, useCallback } from 'react';
import { songsApi, singersApi, bandsApi, contributorsApi, Song, Singer, Band, Contributor } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { Tooltip } from '../components/Tooltip';
import { SkeletonTableRow } from '../components/Skeleton';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Plus, Pencil, Trash2, Radio, Search } from 'lucide-react';
import { toast } from 'sonner';
import { NavigateFn } from '../App';

function ContributorSelect({
  label, value, onChange, type,
}: {
  label: string;
  value: string;
  onChange: (id: string, name: string) => void;
  type: 'COMPOSER' | 'LYRICIST';
}) {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    contributorsApi.getAll({ type: type === 'COMPOSER' ? 'COMPOSER' : 'LYRICIST', q })
      .then(setContributors)
      .catch(console.error);
  }, [q, type]);

  const handleCreate = async () => {
    if (!q.trim()) return;
    setCreating(true);
    try {
      const c = await contributorsApi.create({ name: q.trim(), type });
      onChange(c.id, c.name);
      setQ(c.name);
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка');
    } finally { setCreating(false); }
  };

  const selected = contributors.find(c => c.id === value);
  const displayValue = selected?.name ?? q;

  return (
    <div className="relative">
      <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <div className="relative">
        <input
          className="input-base pr-8"
          value={displayValue}
          onChange={e => { setQ(e.target.value); onChange('', ''); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={`Поиск или создать ${label.toLowerCase()}...`}
        />
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
      </div>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-xl overflow-hidden"
            style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-base)', boxShadow: 'var(--shadow-lg)' }}>
            {contributors.length === 0 && q && (
              <button
                className="w-full text-left px-4 py-3 text-[13px] flex items-center gap-2"
                style={{ color: 'var(--accent)' }}
                onClick={handleCreate}
                disabled={creating}
              >
                <Plus className="w-4 h-4" />
                Создать «{q}»
              </button>
            )}
            {contributors.map(c => (
              <button key={c.id}
                className="w-full text-left px-4 py-2.5 text-[13.5px] transition-colors"
                style={{ color: 'var(--text-primary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                onClick={() => { onChange(c.id, c.name); setQ(c.name); setOpen(false); }}
              >
                {c.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

type Props = { onNavigate?: NavigateFn };

export default function Songs({ onNavigate: _onNavigate }: Props) {
  const { user } = useAuth();
  const [songs, setSongs] = useState<Song[]>([]);
  const [singers, setSingers] = useState<Singer[]>([]);
  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editSong, setEditSong] = useState<Song | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Song | null>(null);
  const [form, setForm] = useState({
    title: '',
    composer_id: '',
    composer_name: '',
    lyricist_id: '',
    lyricist_name: '',
    release_date: '',
  });
  const [selectedSingerIds, setSelectedSingerIds] = useState<string[]>([]);
  const [selectedBandIds, setSelectedBandIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    try {
      const [s, si, b] = await Promise.all([
        songsApi.getAll(),
        singersApi.getAll(),
        bandsApi.getAll(),
      ]);
      setSongs(s);
      setSingers(si);
      setBands(b);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openAdd = () => {
    setEditSong(null);
    setForm({ title: '', composer_id: '', composer_name: '', lyricist_id: '', lyricist_name: '', release_date: '' });
    setSelectedSingerIds([]);
    setSelectedBandIds([]);
    setError(''); setShowForm(true);
  };

  const openEdit = (s: Song) => {
    setEditSong(s);
    setForm({
      title: s.title,
      composer_id: s.composer_id ?? '',
      composer_name: s.composer_name ?? s.composer ?? '',
      lyricist_id: s.lyricist_id ?? '',
      lyricist_name: s.lyricist_name ?? s.lyricist ?? '',
      release_date: s.release_date ?? (s.creation_year ? `${s.creation_year}-01-01` : ''),
    });
    setSelectedSingerIds(s.singers?.map(si => si.id) ?? []);
    setSelectedBandIds(s.bands?.map(b => b.id) ?? []);
    setError(''); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Название обязательно'); return; }
    setSaving(true); setError('');
    const payload = {
      title: form.title.trim(),
      composer_id: form.composer_id || null,
      lyricist_id: form.lyricist_id || null,
      release_date: form.release_date || null,
      singerIds: selectedSingerIds,
      bandIds: selectedBandIds,
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

  const toggleItem = (id: string, list: string[], setList: (v: string[]) => void) =>
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);

  const formatDate = (song: Song) => {
    if (song.release_date) {
      return new Date(song.release_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    if (song.creation_year) return song.creation_year.toString();
    return null;
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
                  { label: 'Дата выпуска', cls: 'hidden sm:table-cell' },
                  { label: '', cls: '' },
                ].map(({ label, cls }, i) => (
                  <th key={i} className={`text-left px-5 py-3.5 text-[11.5px] font-semibold uppercase tracking-wider ${cls}`}
                    style={{ color: 'var(--text-tertiary)' }}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <SkeletonTableRow key={i} cols={5} />)
                : songs.map(song => (
                  <tr key={song.id} className="table-row-hover transition-colors group"
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa' }}>
                          <Radio className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="font-medium text-[14px]" style={{ color: 'var(--text-primary)' }}>
                            {song.title}
                          </span>
                          {(song.singers?.length || song.bands?.length) ? (
                            <div className="flex gap-1 mt-0.5 flex-wrap">
                              {song.singers?.slice(0, 2).map(s => (
                                <span key={s.id} className="badge text-[10px]"
                                  style={{ background: 'rgba(52,211,153,0.08)', color: '#34d399' }}>
                                  {s.name}
                                </span>
                              ))}
                              {song.bands?.slice(0, 1).map(b => (
                                <span key={b.id} className="badge text-[10px]"
                                  style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                                  {b.name}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>
                      {song.composer_name || song.composer || <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>
                      {song.lyricist_name || song.lyricist || <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>
                      {formatDate(song) ?? <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                    </td>
                    <td className="px-5 py-4">
                      {song.created_by === user?.id && (
                        <div className="relative z-10 flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <Tooltip label="Редактировать">
                            <button onClick={() => openEdit(song)} className="btn btn-ghost btn-icon"
                              style={{ color: 'var(--text-tertiary)' }}>
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </Tooltip>
                          <Tooltip label="Удалить">
                            <button onClick={() => setDeleteTarget(song)} className="btn btn-ghost btn-icon"
                              style={{ color: 'var(--text-tertiary)' }}>
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
          size="lg"
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
              <input autoFocus className="input-base" value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Название песни" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ContributorSelect
                label="Композитор"
                value={form.composer_id}
                type="COMPOSER"
                onChange={(id, name) => setForm({ ...form, composer_id: id, composer_name: name })}
              />
              <ContributorSelect
                label="Автор текста"
                value={form.lyricist_id}
                type="LYRICIST"
                onChange={(id, name) => setForm({ ...form, lyricist_id: id, lyricist_name: name })}
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Дата выпуска
              </label>
              <input type="date" className="input-base"
                value={form.release_date}
                onChange={e => setForm({ ...form, release_date: e.target.value })}
              />
            </div>
            {singers.length > 0 && (
              <div>
                <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Исполнители <span style={{ color: 'var(--text-tertiary)' }}>({selectedSingerIds.length} выбрано)</span>
                </label>
                <div className="max-h-28 overflow-y-auto rounded-xl p-2 space-y-0.5"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-base)' }}>
                  {singers.map(s => (
                    <label key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer"
                      style={{ background: selectedSingerIds.includes(s.id) ? 'rgba(52,211,153,0.08)' : 'transparent' }}>
                      <input type="checkbox"
                        checked={selectedSingerIds.includes(s.id)}
                        onChange={() => toggleItem(s.id, selectedSingerIds, setSelectedSingerIds)}
                        className="w-4 h-4 accent-indigo-500" />
                      <span className="text-[13.5px]" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {bands.length > 0 && (
              <div>
                <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Группы <span style={{ color: 'var(--text-tertiary)' }}>({selectedBandIds.length} выбрано)</span>
                </label>
                <div className="max-h-28 overflow-y-auto rounded-xl p-2 space-y-0.5"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-base)' }}>
                  {bands.map(b => (
                    <label key={b.id} className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer"
                      style={{ background: selectedBandIds.includes(b.id) ? 'rgba(99,102,241,0.08)' : 'transparent' }}>
                      <input type="checkbox"
                        checked={selectedBandIds.includes(b.id)}
                        onChange={() => toggleItem(b.id, selectedBandIds, setSelectedBandIds)}
                        className="w-4 h-4 accent-indigo-500" />
                      <span className="text-[13.5px]" style={{ color: 'var(--text-primary)' }}>{b.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
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
