import { useEffect, useState, memo, useCallback } from 'react';
import { singersApi, bandsApi, Singer, Band, Tour } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { NavigateFn } from '../App';
import Modal from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { Tooltip } from '../components/Tooltip';
import { SkeletonList } from '../components/Skeleton';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { CountryCombobox } from '../components/CountryCombobox';
import {
  Plus, Pencil, Trash2, Mic2, Star, Globe, Music2,
  ArrowLeft, Radio, MapPin, Calendar,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Детальная страница исполнителя ────────────────────────────────────────────
type SingerDetailTab = 'info' | 'bands' | 'songs' | 'tours';

function SingerDetailPage({
  singerId,
  onBack,
  onNavigate,
}: {
  singerId: string;
  onBack: () => void;
  onNavigate: NavigateFn;
}) {
  const [singer, setSinger] = useState<Singer | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<SingerDetailTab>('info');

  useEffect(() => {
    setLoading(true);
    singersApi.getOne(singerId)
      .then(setSinger)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [singerId]);

  const formatDate = (d: string | null | undefined) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="skeleton" style={{ width: 120, height: 36 }} />
        <div className="glass-card p-6 space-y-3">
          <div className="skeleton" style={{ width: '40%', height: 28 }} />
          <div className="skeleton" style={{ width: '60%', height: 16 }} />
        </div>
      </div>
    );
  }

  if (!singer) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="btn btn-ghost flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Назад
        </button>
        <EmptyState icon={<Mic2 className="w-5 h-5" />} title="Исполнитель не найден" />
      </div>
    );
  }

  const TABS: { id: SingerDetailTab; label: string; count?: number }[] = [
    { id: 'info',   label: 'Инфо' },
    { id: 'bands',  label: 'Группы',     count: singer.bands?.length ?? 0 },
    { id: 'songs',  label: 'Песни',      count: singer.songs?.length ?? 0 },
    { id: 'tours',  label: 'Туры',       count: singer.tours?.length ?? 0 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="btn btn-ghost btn-icon" aria-label="Назад">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {singer.name}
          </h1>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {singer.country && (
              <span className="flex items-center gap-1.5 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                <Globe className="w-3.5 h-3.5" />{singer.country}
              </span>
            )}
            {singer.rating != null && (
              <span className="badge flex items-center gap-1" style={{ background: 'rgba(251,191,36,0.12)', color: 'var(--warning)' }}>
                <Star className="w-3 h-3 fill-current" />{singer.rating}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Вкладки */}
      <div className="flex gap-1" style={{ borderBottom: '1px solid var(--glass-border)' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-4 py-2.5 text-[13.5px] font-medium transition-colors flex items-center gap-2"
            style={{
              color: tab === t.id ? 'var(--accent)' : 'var(--text-secondary)',
              borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="badge" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Инфо */}
      {tab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-card p-5">
            <h3 className="text-[13px] font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--text-tertiary)' }}>
              Основная информация
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Имя', value: singer.name },
                { label: 'Страна', value: singer.country || '—' },
                { label: 'Рейтинг', value: singer.rating?.toString() ?? '—' },
                { label: 'В системе с', value: formatDate(singer.created_at) },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-1.5"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-[13px] font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--text-tertiary)' }}>
              Статистика
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Групп',  value: singer.bandCount ?? 0,  icon: <Music2 className="w-4 h-4" />,  color: '#6366f1' },
                { label: 'Песен',  value: singer.songCount ?? 0,  icon: <Radio className="w-4 h-4" />,   color: '#60a5fa' },
                { label: 'Туров',  value: singer.tourCount ?? 0,  icon: <MapPin className="w-4 h-4" />,  color: '#fb923c' },
              ].map(({ label, value, icon, color }) => (
                <div key={label} className="p-3 rounded-xl text-center"
                  style={{ background: 'var(--bg-elevated)' }}>
                  <div className="flex justify-center mb-1.5" style={{ color }}>{icon}</div>
                  <p className="text-[22px] font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
                </div>
              ))}
            </div>
            {singer.bio && (
              <div className="mt-4">
                <p className="text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>О себе:</p>
                <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>{singer.bio}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Группы */}
      {tab === 'bands' && (
        <div>
          {(!singer.bands || singer.bands.length === 0) ? (
            <EmptyState icon={<Music2 className="w-5 h-5" />} title="Нет групп" description="Исполнитель не привязан к группам" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {singer.bands.map(b => (
                <button
                  key={b.id}
                  onClick={() => onNavigate('bands', { bandId: b.id })}
                  className="card p-4 flex items-center gap-3 text-left transition-all hover:border-[var(--accent)]"
                  style={{ cursor: 'pointer' }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                    <Music2 className="w-4 h-4" />
                  </div>
                  <span className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>
                    {b.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Песни */}
      {tab === 'songs' && (
        <div>
          {(!singer.songs || singer.songs.length === 0) ? (
            <EmptyState icon={<Radio className="w-5 h-5" />} title="Нет песен" description="Исполнитель не привязан к песням" />
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {['Название', 'Дата выпуска'].map((h, i) => (
                      <th key={i} className="text-left px-5 py-3.5 text-[11.5px] font-semibold uppercase tracking-wider"
                        style={{ color: 'var(--text-tertiary)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {singer.songs.map(s => (
                    <tr key={s.id} className="table-row-hover transition-colors"
                      style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa' }}>
                            <Radio className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-medium text-[14px]" style={{ color: 'var(--text-primary)' }}>
                            {s.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>
                        {s.release_date
                          ? new Date(s.release_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Туры */}
      {tab === 'tours' && (
        <div>
          {(!singer.tours || singer.tours.length === 0) ? (
            <EmptyState icon={<MapPin className="w-5 h-5" />} title="Нет туров"
              description="Нет сольных туров и туров через группы" />
          ) : (
            <div className="space-y-3">
              {singer.tours.map((t: Tour) => (
                <div key={t.id} className="card p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(251,146,60,0.1)', color: '#fb923c' }}>
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {t.program_name}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-1">
                      {t.city && (
                        <span className="flex items-center gap-1.5 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
                          <MapPin className="w-3 h-3" />{t.city}
                        </span>
                      )}
                      {t.start_date && (
                        <span className="flex items-center gap-1.5 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
                          <Calendar className="w-3 h-3" />
                          {new Date(t.start_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                      {/* Задача 5: ссылка на группу */}
                      {t.band && (
                        <button
                          onClick={() => onNavigate('bands', { bandId: t.band_id ?? '' })}
                          className="text-[12px] flex items-center gap-1"
                          style={{ color: 'var(--accent)' }}
                        >
                          <Music2 className="w-3 h-3" />
                          {(t.band as Band).name}
                        </button>
                      )}
                      {t.singer_id && !t.band_id && (
                        <span className="badge" style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399' }}>
                          Сольный тур
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Карточка исполнителя ──────────────────────────────────────────────────────
type SingerCardProps = {
  singer: Singer;
  isOwner: boolean;
  onEdit: (s: Singer) => void;
  onDelete: (s: Singer) => void;
  onOpen: (id: string) => void;
};

const SingerCard = memo(({ singer, isOwner, onEdit, onDelete, onOpen }: SingerCardProps) => (
  <div
    className="card card-hover p-4 animate-fade-in cursor-pointer"
    onClick={() => onOpen(singer.id)}
    style={{ position: 'relative' }}
  >
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399' }}>
        <Mic2 className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="text-[14px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {singer.name}
          </span>
          {singer.rating != null && (
            <span className="badge flex items-center gap-1" style={{ background: 'rgba(251,191,36,0.12)', color: 'var(--warning)' }}>
              <Star className="w-3 h-3 fill-current" />{singer.rating}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[12px] flex-wrap" style={{ color: 'var(--text-tertiary)' }}>
          {singer.country && (
            <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{singer.country}</span>
          )}
          {singer.bands && singer.bands.length > 0 && (
            <span className="flex items-center gap-1">
              <Music2 className="w-3 h-3" />
              {singer.bands.slice(0, 2).map(b => b.name).join(', ')}
              {singer.bands.length > 2 && ` +${singer.bands.length - 2}`}
            </span>
          )}
        </div>
      </div>
      {/* Задача 1: z-index для кнопок */}
      {isOwner && (
        <div
          className="flex items-center gap-1 flex-shrink-0"
          style={{ position: 'relative', zIndex: 'var(--z-card-actions)' }}
          onClick={e => e.stopPropagation()}
        >
          <Tooltip label="Редактировать">
            <button onClick={() => onEdit(singer)} className="btn btn-ghost btn-icon" aria-label="Редактировать"
              style={{ color: 'var(--text-tertiary)' }}>
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <Tooltip label="Удалить">
            <button onClick={() => onDelete(singer)} className="btn btn-ghost btn-icon" aria-label="Удалить"
              style={{ color: 'var(--text-tertiary)' }}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        </div>
      )}
    </div>
  </div>
));
SingerCard.displayName = 'SingerCard';

// ── Основной компонент Singers ────────────────────────────────────────────────
type Props = {
  onNavigate: NavigateFn;
  initialSingerId?: string;
};

export default function Singers({ onNavigate, initialSingerId }: Props) {
  const { user } = useAuth();
  const [singers, setSingers] = useState<Singer[]>([]);
  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editSinger, setEditSinger] = useState<Singer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Singer | null>(null);
  const [selectedSingerId, setSelectedSingerId] = useState<string | null>(initialSingerId ?? null);
  const [form, setForm] = useState({ name: '', country: '', rating: '', bio: '' });
  const [selectedBandIds, setSelectedBandIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    try {
      const [s, b] = await Promise.all([singersApi.getAll(), bandsApi.getAll()]);
      setSingers(s);
      setBands(b);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Если пришёл initialSingerId — сразу открываем детальную
  useEffect(() => {
    if (initialSingerId) setSelectedSingerId(initialSingerId);
  }, [initialSingerId]);

  const openAdd = () => {
    setEditSinger(null);
    setForm({ name: '', country: '', rating: '', bio: '' });
    setSelectedBandIds([]);
    setError(''); setShowForm(true);
  };

  const openEdit = (s: Singer) => {
    setEditSinger(s);
    setForm({ name: s.name, country: s.country ?? '', rating: s.rating?.toString() ?? '', bio: s.bio ?? '' });
    setSelectedBandIds(s.bands?.map(b => b.id) ?? []);
    setError(''); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Имя обязательно'); return; }
    setSaving(true); setError('');
    const payload = {
      name: form.name.trim(),
      country: form.country.trim(),
      rating: form.rating ? parseFloat(form.rating) : null,
      bio: form.bio.trim(),
      bandIds: selectedBandIds,
    };
    try {
      if (editSinger) {
        await singersApi.update(editSinger.id, payload);
        toast.success('Исполнитель обновлён');
      } else {
        await singersApi.create(payload);
        toast.success('Исполнитель добавлен');
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
      await singersApi.delete(deleteTarget.id);
      toast.success('Исполнитель удалён');
      await fetchAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка удаления');
    } finally { setDeleteTarget(null); }
  };

  const toggleBand = (id: string) =>
    setSelectedBandIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // Детальная страница
  if (selectedSingerId) {
    return (
      <SingerDetailPage
        singerId={selectedSingerId}
        onBack={() => setSelectedSingerId(null)}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Исполнители</h1>
          <p className="text-[13.5px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {singers.length} {singers.length === 1 ? 'исполнитель' : singers.length < 5 ? 'исполнителя' : 'исполнителей'}
          </p>
        </div>
        <button onClick={openAdd} className="btn btn-primary">
          <Plus className="w-4 h-4" /> Добавить
        </button>
      </div>

      {loading ? <SkeletonList rows={6} /> : singers.length === 0 ? (
        <EmptyState
          icon={<Mic2 className="w-5 h-5" />}
          title="Нет исполнителей"
          description="Добавьте первого исполнителя в базу"
          action={<button onClick={openAdd} className="btn btn-primary"><Plus className="w-4 h-4" /> Добавить</button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {singers.map(s => (
            <SingerCard
              key={s.id}
              singer={s}
              isOwner={s.created_by === user?.id}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
              onOpen={setSelectedSingerId}
            />
          ))}
        </div>
      )}

      {showForm && (
        <Modal
          title={editSinger ? 'Редактировать исполнителя' : 'Новый исполнитель'}
          subtitle={editSinger ? `Редактирование: ${editSinger.name}` : 'Добавить исполнителя в базу'}
          onClose={() => setShowForm(false)}
          size="md"
          footer={
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="btn btn-ghost">Отмена</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                {saving ? 'Сохранение...' : editSinger ? 'Сохранить' : 'Добавить'}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Полное имя *</label>
              <input autoFocus className="input-base" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                placeholder="Имя исполнителя" />
            </div>

            {/* Задача 3: CountryCombobox */}
            <CountryCombobox
              label="Страна"
              value={form.country}
              onChange={v => setForm({ ...form, country: v })}
            />

            <div>
              <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Рейтинг (1–10)</label>
              <input type="number" min="1" max="10" step="0.1" className="input-base"
                value={form.rating}
                onChange={e => setForm({ ...form, rating: e.target.value })}
                placeholder="8.5" />
            </div>

            <div>
              <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>О себе</label>
              <textarea className="input-base" rows={3} value={form.bio}
                onChange={e => setForm({ ...form, bio: e.target.value })}
                placeholder="Краткое описание..." style={{ resize: 'vertical' }} />
            </div>

            {bands.length > 0 && (
              <div>
                <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Группы <span style={{ color: 'var(--text-tertiary)' }}>({selectedBandIds.length} выбрано)</span>
                </label>
                <div className="max-h-36 overflow-y-auto rounded-xl p-2 space-y-0.5"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-base)' }}>
                  {bands.map(b => (
                    <label key={b.id} className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors"
                      style={{ background: selectedBandIds.includes(b.id) ? 'rgba(99,102,241,0.08)' : 'transparent' }}>
                      <input type="checkbox"
                        checked={selectedBandIds.includes(b.id)}
                        onChange={() => toggleBand(b.id)}
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
          title="Удалить исполнителя?"
          description={`Вы уверены, что хотите удалить исполнителя «${deleteTarget.name}»? Это действие необратимо.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}