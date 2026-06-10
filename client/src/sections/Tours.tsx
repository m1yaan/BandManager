import { useEffect, useState, useCallback } from 'react';
import { toursApi, bandsApi, singersApi, songsApi, Tour, Band, Singer, Song, TourStop, RiderItem } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { NavigateFn } from '../App';
import Modal from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { Tooltip } from '../components/Tooltip';
import { SkeletonList } from '../components/Skeleton';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  Plus, Pencil, Trash2, MapPin, Calendar, ChevronDown, ChevronUp, Music,
  Music2, Mic2, Ticket, Settings, CheckCircle2, AlertCircle, Clock, X, DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';

type TourWithDetails = Tour & { tourSongs?: Song[]; stops?: TourStop[]; rider?: RiderItem[] };
type OwnerType = 'band' | 'singer';

const formatDate = (d: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидает', confirmed: 'Подтверждено', problem: 'Проблема',
};
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:   { bg: 'var(--warning-muted)',  color: 'var(--warning)' },
  confirmed: { bg: 'var(--success-muted)',  color: 'var(--success)' },
  problem:   { bg: 'var(--error-muted)',    color: 'var(--error)' },
};
const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending:   <Clock className="w-3.5 h-3.5" />,
  confirmed: <CheckCircle2 className="w-3.5 h-3.5" />,
  problem:   <AlertCircle className="w-3.5 h-3.5" />,
};

// TourExpandedPanel без изменений кроме ticket_price (уже исправлено в прошлой сессии)
// Вставляем полную версию компонента:
function TourExpandedPanel({ tour, isOwner }: { tour: TourWithDetails; isOwner: boolean }) {
  const [tab, setTab] = useState<'setlist' | 'stops' | 'rider' | 'finances'>('setlist');
  const [stops, setStops] = useState<TourStop[]>(tour.stops ?? []);
  const [rider, setRider] = useState<RiderItem[]>(tour.rider ?? []);
  const [finances, setFinances] = useState<Partial<Tour> & { profit?: number }>({});
  const [newStop, setNewStop] = useState({ city: '', event_date: '', ticket_price: '' });
  const [newRiderItem, setNewRiderItem] = useState('');
  const [editingFinances, setEditingFinances] = useState(false);
  const [finForm, setFinForm] = useState({
    fee: '', tax_percent: '', agent_commission_percent: '',
    transport: '', per_diem: '', hotel: '', other_expenses: '',
    base_ticket_price: '', city_coefficient: '',
  });

  useEffect(() => {
    if (tab === 'stops' && !tour.stops) {
      toursApi.getStops(tour.id).then(setStops).catch(console.error);
    }
    if (tab === 'rider' && !tour.rider) {
      toursApi.getRider(tour.id).then(setRider).catch(console.error);
    }
    if (tab === 'finances') {
      toursApi.getFinances(tour.id).then(f => {
        setFinances(f);
        setFinForm({
          fee:                      (f.fee ?? 0).toString(),
          tax_percent:              (f.tax_percent ?? 0).toString(),
          agent_commission_percent: (f.agent_commission_percent ?? 0).toString(),
          transport:                (f.transport ?? 0).toString(),
          per_diem:                 (f.per_diem ?? 0).toString(),
          hotel:                    (f.hotel ?? 0).toString(),
          other_expenses:           (f.other_expenses ?? 0).toString(),
          base_ticket_price:        (f.base_ticket_price ?? 1000).toString(),
          city_coefficient:         (f.city_coefficient ?? 1.0).toString(),
        });
      }).catch(console.error);
    }
  }, [tab, tour.id, tour.stops, tour.rider]);

  const addStop = async () => {
    if (!newStop.city.trim()) return;
    try {
      const stop = await toursApi.addStop(tour.id, {
        city: newStop.city.trim(),
        event_date: newStop.event_date || null,
        ticket_price: newStop.ticket_price ? parseFloat(newStop.ticket_price) : 0,
      });
      setStops(prev => [...prev, stop]);
      setNewStop({ city: '', event_date: '', ticket_price: '' });
      toast.success('Город добавлен');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Ошибка добавления'); }
  };

  const deleteStop = async (stopId: string) => {
    try {
      await toursApi.deleteStop(tour.id, stopId);
      setStops(prev => prev.filter(s => s.id !== stopId));
      toast.success('Город удалён');
    } catch { toast.error('Ошибка удаления'); }
  };

  const addRiderItem = async () => {
    if (!newRiderItem.trim()) return;
    try {
      const item = await toursApi.addRiderItem(tour.id, { item_name: newRiderItem.trim() });
      setRider(prev => [...prev, item]);
      setNewRiderItem('');
      toast.success('Пункт добавлен');
    } catch { toast.error('Ошибка добавления'); }
  };

  const updateRiderStatus = async (item: RiderItem, status: RiderItem['status']) => {
    try {
      const updated = await toursApi.updateRiderItem(item.id, { ...item, status });
      setRider(prev => prev.map(r => r.id === item.id ? updated : r));
    } catch { toast.error('Ошибка обновления'); }
  };

  const deleteRiderItem = async (itemId: string) => {
    try {
      await toursApi.deleteRiderItem(itemId);
      setRider(prev => prev.filter(r => r.id !== itemId));
      toast.success('Пункт удалён');
    } catch { toast.error('Ошибка удаления'); }
  };

  const saveFinances = async () => {
    try {
      await toursApi.updateFinances(tour.id, {
        fee:                      parseFloat(finForm.fee) || 0,
        tax_percent:              parseFloat(finForm.tax_percent) || 0,
        agent_commission_percent: parseFloat(finForm.agent_commission_percent) || 0,
        transport:                parseFloat(finForm.transport) || 0,
        per_diem:                 parseFloat(finForm.per_diem) || 0,
        hotel:                    parseFloat(finForm.hotel) || 0,
        other_expenses:           parseFloat(finForm.other_expenses) || 0,
        base_ticket_price:        parseFloat(finForm.base_ticket_price) || 1000,
        city_coefficient:         parseFloat(finForm.city_coefficient) || 1.0,
      });
      const updated = await toursApi.getFinances(tour.id);
      setFinances(updated);
      setEditingFinances(false);
      toast.success('Финансы сохранены');
    } catch { toast.error('Ошибка сохранения'); }
  };

  // Задача 6: безопасный расчёт
  const safeNum = (v: string | number | undefined | null, fb = 0) => {
    const n = parseFloat(String(v ?? fb));
    return isNaN(n) ? fb : n;
  };

  const fee = safeNum(editingFinances ? finForm.fee : finances.fee);
  const tax = safeNum(editingFinances ? finForm.tax_percent : finances.tax_percent);
  const agentPct = safeNum(editingFinances ? finForm.agent_commission_percent : finances.agent_commission_percent);
  const transport = safeNum(editingFinances ? finForm.transport : finances.transport);
  const perDiem = safeNum(editingFinances ? finForm.per_diem : finances.per_diem);
  const hotel = safeNum(editingFinances ? finForm.hotel : finances.hotel);
  const other = safeNum(editingFinances ? finForm.other_expenses : finances.other_expenses);
  const taxAmount = fee * tax / 100;
  const commissionAmount = fee * agentPct / 100;
  const totalExpenses = taxAmount + commissionAmount + transport + perDiem + hotel + other;
  const profit = fee - totalExpenses;

  const progressConfirmed = rider.filter(r => r.status === 'confirmed').length;
  const progressTotal = rider.length;

  const TABS = [
    { id: 'setlist'  as const, label: 'Сет-лист' },
    { id: 'stops'    as const, label: 'Города' },
    { id: 'rider'    as const, label: 'Райдер' },
    { id: 'finances' as const, label: 'Финансы' },
  ];

  return (
    <div style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}>
      <div className="flex gap-0.5 px-5 pt-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-4 py-2 text-[13px] font-medium rounded-t-lg transition-colors"
            style={{
              background: tab === t.id ? 'var(--bg-surface)' : 'transparent',
              color: tab === t.id ? 'var(--accent)' : 'var(--text-secondary)',
              borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
            }}
          >
            {t.label}
            {t.id === 'rider' && progressTotal > 0 && (
              <span className="ml-1.5 badge" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                {progressConfirmed}/{progressTotal}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="px-5 py-4">
        {tab === 'setlist' && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Music className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
              <span className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
                Программа выступления
              </span>
            </div>
            {tour.tourSongs && tour.tourSongs.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tour.tourSongs.map(s => (
                  <span key={s.id} className="badge" style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa' }}>
                    {s.title}
                  </span>
                ))}
              </div>
            ) : <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Нет песен в программе</p>}
          </div>
        )}

        {tab === 'stops' && (
          <div className="space-y-3">
            {stops.length > 0 ? (
              <div className="space-y-2">
                {stops.map(stop => (
                  <div key={stop.id} className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-base)' }}>
                    <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: '#fb923c' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-medium" style={{ color: 'var(--text-primary)' }}>{stop.city}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {stop.event_date && (
                          <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{formatDate(stop.event_date)}</span>
                        )}
                        {stop.ticket_price > 0 && (
                          <span className="text-[12px]" style={{ color: 'var(--success)' }}>
                            {stop.ticket_price.toLocaleString()} ₽ / билет
                          </span>
                        )}
                      </div>
                    </div>
                    {isOwner && (
                      <button onClick={() => deleteStop(stop.id)} className="btn btn-ghost btn-icon"
                        style={{ color: 'var(--text-tertiary)' }}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Города не добавлены</p>
            )}
            {isOwner && (
              <div className="flex gap-2 mt-3">
                <input className="input-base flex-1" style={{ padding: '8px 12px', fontSize: 13 }}
                  value={newStop.city} onChange={e => setNewStop(p => ({ ...p, city: e.target.value }))}
                  placeholder="Город" />
                <input type="date" className="input-base" style={{ padding: '8px 12px', fontSize: 13, width: 140 }}
                  value={newStop.event_date} onChange={e => setNewStop(p => ({ ...p, event_date: e.target.value }))} />
                <input type="number" className="input-base" style={{ padding: '8px 12px', fontSize: 13, width: 120 }}
                  value={newStop.ticket_price} onChange={e => setNewStop(p => ({ ...p, ticket_price: e.target.value }))}
                  placeholder="Цена ₽" />
                <button onClick={addStop} className="btn btn-primary flex-shrink-0">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {tab === 'rider' && (
          <div className="space-y-3">
            {rider.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Выполнено: {progressConfirmed}/{progressTotal}
                  </span>
                  <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                    {progressTotal > 0 ? Math.round(progressConfirmed / progressTotal * 100) : 0}%
                  </span>
                </div>
                <div className="w-full rounded-full h-1.5 mb-3" style={{ background: 'var(--bg-elevated)' }}>
                  <div className="h-1.5 rounded-full transition-all"
                    style={{ width: `${progressTotal > 0 ? (progressConfirmed / progressTotal) * 100 : 0}%`, background: 'var(--success)' }} />
                </div>
                {rider.map(item => (
                  <div key={item.id} className="flex items-center gap-3 py-2.5 border-b"
                    style={{ borderColor: 'var(--border-subtle)' }}>
                    <div className="flex-1">
                      <p className="text-[13.5px]" style={{
                        color: 'var(--text-primary)',
                        textDecoration: item.status === 'confirmed' ? 'line-through' : 'none',
                        opacity: item.status === 'confirmed' ? 0.6 : 1,
                      }}>
                        {item.item_name}
                      </p>
                      {item.note && <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{item.note}</p>}
                    </div>
                    {isOwner && (
                      <div className="flex items-center gap-1">
                        {(['pending', 'confirmed', 'problem'] as const).map(s => (
                          <button key={s} onClick={() => updateRiderStatus(item, s)}
                            className="badge flex items-center gap-1 transition-all"
                            style={{
                              ...STATUS_COLORS[s],
                              opacity: item.status === s ? 1 : 0.35,
                              cursor: 'pointer', border: 'none',
                            }}
                            title={STATUS_LABELS[s]}
                          >
                            {STATUS_ICONS[s]}
                          </button>
                        ))}
                        <button onClick={() => deleteRiderItem(item.id)} className="btn btn-ghost btn-icon ml-1"
                          style={{ color: 'var(--text-tertiary)' }}>
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    {!isOwner && (
                      <span className="badge flex items-center gap-1" style={STATUS_COLORS[item.status]}>
                        {STATUS_ICONS[item.status]}{STATUS_LABELS[item.status]}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {rider.length === 0 && <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Райдер пуст</p>}
            {isOwner && (
              <div className="flex gap-2 mt-2">
                <input className="input-base flex-1" style={{ padding: '8px 12px', fontSize: 13 }}
                  value={newRiderItem} onChange={e => setNewRiderItem(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addRiderItem()}
                  placeholder="Новый пункт райдера…" />
                <button onClick={addRiderItem} className="btn btn-primary flex-shrink-0">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {tab === 'finances' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" style={{ color: 'var(--success)' }} />
                <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>Финансовый расчёт</span>
              </div>
              {isOwner && (
                <button onClick={() => setEditingFinances(!editingFinances)} className="btn btn-ghost btn-icon">
                  <Settings className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                </button>
              )}
            </div>

            {editingFinances ? (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'fee',                      label: 'Гонорар (₽)' },
                  { key: 'tax_percent',              label: 'Налог (%)' },
                  { key: 'agent_commission_percent', label: 'Комиссия агента (%)' },
                  { key: 'transport',                label: 'Транспорт (₽)' },
                  { key: 'per_diem',                 label: 'Суточные (₽)' },
                  { key: 'hotel',                    label: 'Гостиница (₽)' },
                  { key: 'other_expenses',           label: 'Прочие расходы (₽)' },
                  { key: 'base_ticket_price',        label: 'Базовая цена билета (₽)' },
                  { key: 'city_coefficient',         label: 'Коэф. города' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                      {label}
                    </label>
                    <input type="number" min="0" step="0.01" className="input-base"
                      style={{ padding: '7px 11px', fontSize: 13 }}
                      value={finForm[key as keyof typeof finForm]}
                      onChange={e => setFinForm(p => ({ ...p, [key]: e.target.value }))} />
                  </div>
                ))}
                <div className="col-span-2 flex justify-end gap-3 mt-2">
                  <button onClick={() => setEditingFinances(false)} className="btn btn-ghost">Отмена</button>
                  <button onClick={saveFinances} className="btn btn-primary">Сохранить</button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {[
                  { label: 'Гонорар', value: fee, isIncome: true },
                  { label: `Налог (${tax}%)`, value: -taxAmount },
                  { label: `Комиссия агента (${agentPct}%)`, value: -commissionAmount },
                  { label: 'Транспорт', value: -transport },
                  { label: 'Суточные', value: -perDiem },
                  { label: 'Гостиница', value: -hotel },
                  { label: 'Прочие расходы', value: -other },
                ].map(({ label, value, isIncome }) => (
                  <div key={label} className="flex items-center justify-between py-1.5"
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                    <span className="text-[13px] font-medium" style={{
                      color: isIncome ? 'var(--success)' : value < 0 ? 'var(--error)' : 'var(--text-primary)'
                    }}>
                      {value >= 0 ? '+' : ''}{Math.round(value).toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-3">
                  <span className="text-[14px] font-bold" style={{ color: 'var(--text-primary)' }}>Чистая прибыль</span>
                  <span className="text-[16px] font-bold" style={{ color: profit >= 0 ? 'var(--success)' : 'var(--error)' }}>
                    {Math.round(profit).toLocaleString('ru-RU')} ₽
                  </span>
                </div>
                {finances.avg_ticket_price != null && finances.avg_ticket_price > 0 && (
                  <p className="text-[12px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    Расч. цена билета: {Math.round(finances.avg_ticket_price ?? 0).toLocaleString('ru-RU')} ₽
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Основной компонент Tours ───────────────────────────────────────────────────
type Props = {
  onNavigate: NavigateFn;
};

export default function Tours({ onNavigate }: Props) {
  const { user } = useAuth();
  const [tours, setTours] = useState<TourWithDetails[]>([]);
  const [bands, setBands] = useState<Band[]>([]);
  const [singers, setSingers] = useState<Singer[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTour, setEditTour] = useState<Tour | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tour | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Задача 2: тип участника
  const [ownerType, setOwnerType] = useState<OwnerType>('band');
  const [form, setForm] = useState({
    program_name: '', city: '', start_date: '', end_date: '',
    avg_ticket_price: '', band_id: '', singer_id: '',
  });
  const [selectedSongs, setSelectedSongs] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchTours = useCallback(async () => {
    try { setTours(await toursApi.getAll()); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchTours();
    bandsApi.getAll().then(setBands).catch(console.error);
    singersApi.getAll().then(setSingers).catch(console.error);
    songsApi.getAll().then(setSongs).catch(console.error);
  }, [fetchTours]);

  const toggleExpand = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    try {
      const [tourSongs, stops, rider] = await Promise.all([
        toursApi.getSongs(id),
        toursApi.getStops(id),
        toursApi.getRider(id),
      ]);
      setTours(prev => prev.map(t => t.id === id ? { ...t, tourSongs, stops, rider } : t));
    } catch (err) { console.error(err); }
  };

  const openAdd = () => {
    setEditTour(null);
    setOwnerType('band');
    setForm({
      program_name: '', city: '', start_date: '', end_date: '',
      avg_ticket_price: '',
      band_id: bands[0]?.id ?? '',
      singer_id: singers[0]?.id ?? '',
    });
    setSelectedSongs([]); setError(''); setShowForm(true);
  };

  const openEdit = async (tour: Tour) => {
    setEditTour(tour);
    const issinger = !!tour.singer_id && !tour.band_id;
    setOwnerType(issinger ? 'singer' : 'band');
    setForm({
      program_name: tour.program_name, city: tour.city,
      start_date: tour.start_date ?? '', end_date: tour.end_date ?? '',
      avg_ticket_price: tour.avg_ticket_price?.toString() ?? '',
      band_id: tour.band_id ?? '',
      singer_id: tour.singer_id ?? '',
    });
    try { setSelectedSongs((await toursApi.getSongs(tour.id)).map(s => s.id)); }
    catch { setSelectedSongs([]); }
    setError(''); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.program_name.trim()) { setError('Название программы обязательно'); return; }
    if (ownerType === 'band' && !form.band_id) { setError('Выберите группу'); return; }
    if (ownerType === 'singer' && !form.singer_id) { setError('Выберите исполнителя'); return; }
    setSaving(true); setError('');
    const payload = {
      program_name: form.program_name.trim(), city: form.city.trim(),
      start_date: form.start_date || null, end_date: form.end_date || null,
      avg_ticket_price: form.avg_ticket_price ? parseFloat(form.avg_ticket_price) : 0,
      band_id:   ownerType === 'band'   ? form.band_id   : null,
      singer_id: ownerType === 'singer' ? form.singer_id : null,
      songIds: selectedSongs,
    };
    try {
      if (editTour) {
        await toursApi.update(editTour.id, payload);
        toast.success('Тур обновлён');
      } else {
        await toursApi.create(payload);
        toast.success('Тур создан');
      }
      await fetchTours(); setShowForm(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка сохранения';
      setError(msg); toast.error(msg);
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await toursApi.delete(deleteTarget.id);
      toast.success('Тур удалён');
      await fetchTours();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка удаления');
    } finally { setDeleteTarget(null); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Туры</h1>
          <p className="text-[13.5px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {tours.length} {tours.length === 1 ? 'тур' : tours.length < 5 ? 'тура' : 'туров'}
          </p>
        </div>
        <button onClick={openAdd} className="btn btn-primary">
          <Plus className="w-4 h-4" /> Новый тур
        </button>
      </div>

      {loading ? <SkeletonList rows={3} /> : tours.length === 0 ? (
        <EmptyState
          icon={<MapPin className="w-5 h-5" />}
          title="Нет туров"
          description="Создайте первый гастрольный тур"
          action={<button onClick={openAdd} className="btn btn-primary"><Plus className="w-4 h-4" /> Новый тур</button>}
        />
      ) : (
        <div className="space-y-3">
          {tours.map(tour => (
            <div key={tour.id} className="card overflow-visible">  {/* Задача 1: overflow-visible */}
              <div className="flex items-start gap-4 px-5 py-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: 'rgba(251,146,60,0.1)', color: '#fb923c' }}>
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[14.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {tour.program_name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5">
                    {tour.city && (
                      <span className="flex items-center gap-1.5 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
                        <MapPin className="w-3 h-3" />{tour.city}
                      </span>
                    )}
                    {(tour.start_date || tour.end_date) && (
                      <span className="flex items-center gap-1.5 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
                        <Calendar className="w-3 h-3" />
                        {formatDate(tour.start_date)} — {formatDate(tour.end_date)}
                      </span>
                    )}
                    {tour.avg_ticket_price > 0 && (
                      <span className="badge flex items-center gap-1.5" style={{ background: 'var(--success-muted)', color: 'var(--success)' }}>
                        <Ticket className="w-3 h-3" />{tour.avg_ticket_price.toLocaleString()} ₽ ср.
                      </span>
                    )}
                  </div>
                  {/* Задача 2 + 5: отображение владельца тура со ссылкой */}
                  <div className="mt-1">
                    {tour.band && (
                      <button
                        onClick={() => onNavigate('bands', { bandId: tour.band_id ?? '' })}
                        className="flex items-center gap-1 text-[12px] transition-colors hover:underline"
                        style={{ color: 'var(--accent)' }}
                      >
                        <Music2 className="w-3 h-3" />
                        Группа: {(tour.band as Band).name}
                      </button>
                    )}
                    {tour.singer_id && !tour.band_id && tour.singer_data && (
                      <button
                        onClick={() => onNavigate('singers', { singerId: tour.singer_id ?? '' })}
                        className="flex items-center gap-1 text-[12px] transition-colors hover:underline"
                        style={{ color: '#34d399' }}
                      >
                        <Mic2 className="w-3 h-3" />
                        Исполнитель: {(tour.singer_data as Singer).name}
                      </button>
                    )}
                  </div>
                </div>

                {/* Задача 1: z-index fix для кнопок */}
                <div
                  className="flex items-center gap-1.5 flex-shrink-0"
                  style={{ position: 'relative', zIndex: 'var(--z-card-actions)' }}
                >
                  {tour.created_by === user?.id && (
                    <>
                      <Tooltip label="Редактировать">
                        <button onClick={() => openEdit(tour)} className="btn btn-ghost btn-icon"
                          style={{ color: 'var(--text-tertiary)' }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                      <Tooltip label="Удалить">
                        <button onClick={() => setDeleteTarget(tour)} className="btn btn-ghost btn-icon"
                          style={{ color: 'var(--text-tertiary)' }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                    </>
                  )}
                  <Tooltip label={expandedId === tour.id ? 'Свернуть' : 'Раскрыть'}>
                    <button onClick={() => toggleExpand(tour.id)} className="btn btn-ghost btn-icon"
                      style={{ color: 'var(--text-tertiary)' }}>
                      {expandedId === tour.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </Tooltip>
                </div>
              </div>

              {expandedId === tour.id && (
                <TourExpandedPanel tour={tour} isOwner={tour.created_by === user?.id} />
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal
          title={editTour ? 'Редактировать тур' : 'Новый тур'}
          subtitle={editTour ? `Редактирование: «${editTour.program_name}»` : 'Создать гастрольный тур'}
          onClose={() => setShowForm(false)}
          size="lg"
          footer={
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="btn btn-ghost">Отмена</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                {saving ? 'Сохранение...' : editTour ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          }
        >
          <div className="space-y-5">
            <div>
              <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Название программы *
              </label>
              <input autoFocus className="input-base" value={form.program_name}
                onChange={e => setForm({ ...form, program_name: e.target.value })}
                placeholder="Мировой тур 2025" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Город</label>
                <input className="input-base" value={form.city}
                  onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Москва" />
              </div>
              <div>
                <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Ср. цена билета (₽)</label>
                <input type="number" min="0" step="100" className="input-base"
                  value={form.avg_ticket_price}
                  onChange={e => setForm({ ...form, avg_ticket_price: e.target.value })} placeholder="2500" />
              </div>
              <div>
                <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Дата начала</label>
                <input type="date" className="input-base" value={form.start_date}
                  onChange={e => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Дата окончания</label>
                <input type="date" className="input-base" value={form.end_date}
                  onChange={e => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>

            {/* Задача 2: тип участника */}
            <div>
              <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Тип участника *
              </label>
              <div className="flex gap-3 mb-3">
                {[
                  { value: 'band' as OwnerType, label: '🎸 Группа', icon: <Music2 className="w-4 h-4" /> },
                  { value: 'singer' as OwnerType, label: '🎤 Сольный исполнитель', icon: <Mic2 className="w-4 h-4" /> },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setOwnerType(value)}
                    className="flex-1 p-3 rounded-xl text-left transition-all text-[13.5px] font-medium"
                    style={{
                      background: ownerType === value ? 'var(--accent-muted)' : 'var(--bg-elevated)',
                      border: `1px solid ${ownerType === value ? 'var(--accent)' : 'var(--border-base)'}`,
                      color: ownerType === value ? 'var(--accent)' : 'var(--text-secondary)',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {ownerType === 'band' && (
                <select className="input-base" value={form.band_id}
                  onChange={e => setForm({ ...form, band_id: e.target.value })}>
                  <option value="">Выберите группу</option>
                  {bands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              )}
              {ownerType === 'singer' && (
                <select className="input-base" value={form.singer_id}
                  onChange={e => setForm({ ...form, singer_id: e.target.value })}>
                  <option value="">Выберите исполнителя</option>
                  {singers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
            </div>

            {songs.length > 0 && (
              <div>
                <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Программа <span style={{ color: 'var(--text-tertiary)' }}>({selectedSongs.length} песен)</span>
                </label>
                <div className="max-h-36 overflow-y-auto rounded-xl p-2 space-y-0.5"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-base)' }}>
                  {songs.map(s => (
                    <label key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer"
                      style={{ background: selectedSongs.includes(s.id) ? 'rgba(96,165,250,0.08)' : 'transparent' }}>
                      <input type="checkbox"
                        checked={selectedSongs.includes(s.id)}
                        onChange={() => setSelectedSongs(prev =>
                          prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id]
                        )}
                        className="w-4 h-4 accent-indigo-500" />
                      <span className="text-[13.5px]" style={{ color: 'var(--text-primary)' }}>{s.title}</span>
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
          title="Удалить тур?"
          description={`Вы уверены, что хотите удалить тур «${deleteTarget.program_name}»?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}