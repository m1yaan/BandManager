import { useEffect, useState, useCallback } from 'react';
import { toursApi, bandsApi, songsApi, Tour, Band, Song } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { Tooltip } from '../components/Tooltip';
import { SkeletonList } from '../components/Skeleton';
import { Plus, Pencil, Trash2, MapPin, Calendar, ChevronDown, ChevronUp, Music, Ticket } from 'lucide-react';

type TourWithDetails = Tour & { tourSongs?: Song[] };

const formatDate = (d: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

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

  const fetchTours = useCallback(async () => {
    try { setTours(await toursApi.getAll()); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchTours();
    bandsApi.getAll().then(setBands).catch(console.error);
    songsApi.getAll().then(setSongs).catch(console.error);
  }, [fetchTours]);

  const toggleExpand = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    try {
      const tourSongs = await toursApi.getSongs(id);
      setTours(prev => prev.map(t => t.id === id ? { ...t, tourSongs } : t));
    } catch (err) { console.error(err); }
  };

  const openAdd = () => {
    setEditTour(null);
    setForm({ program_name: '', city: '', start_date: '', end_date: '', avg_ticket_price: '', band_id: bands[0]?.id ?? '' });
    setSelectedSongs([]); setError(''); setShowForm(true);
  };

  const openEdit = async (tour: Tour) => {
    setEditTour(tour);
    setForm({
      program_name: tour.program_name, city: tour.city,
      start_date: tour.start_date ?? '', end_date: tour.end_date ?? '',
      avg_ticket_price: tour.avg_ticket_price?.toString() ?? '', band_id: tour.band_id,
    });
    try {
      const ts = await toursApi.getSongs(tour.id);
      setSelectedSongs(ts.map(s => s.id));
    } catch { setSelectedSongs([]); }
    setError(''); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.program_name.trim()) { setError('Program name is required'); return; }
    if (!form.band_id) { setError('Please select a band'); return; }
    setSaving(true); setError('');
    const payload = {
      program_name: form.program_name.trim(), city: form.city.trim(),
      start_date: form.start_date || null, end_date: form.end_date || null,
      avg_ticket_price: form.avg_ticket_price ? parseFloat(form.avg_ticket_price) : 0,
      band_id: form.band_id, songIds: selectedSongs,
    };
    try {
      if (editTour) await toursApi.update(editTour.id, payload);
      else await toursApi.create(payload);
      await fetchTours(); setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this tour?')) return;
    try { await toursApi.delete(id); await fetchTours(); }
    catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Tours</h1>
          <p className="text-[13.5px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {tours.length} {tours.length === 1 ? 'tour' : 'tours'} scheduled
          </p>
        </div>
        <button onClick={openAdd} className="btn btn-primary">
          <Plus className="w-4 h-4" /> New Tour
        </button>
      </div>

      {loading ? <SkeletonList rows={3} /> : tours.length === 0 ? (
        <EmptyState
          icon={<MapPin className="w-5 h-5" />}
          title="No tours planned"
          description="Create your first tour to start booking shows"
          action={<button onClick={openAdd} className="btn btn-primary"><Plus className="w-4 h-4" /> New Tour</button>}
        />
      ) : (
        <div className="space-y-3">
          {tours.map(tour => (
            <div key={tour.id} className="card overflow-hidden">
              <div className="flex items-start gap-4 px-5 py-4">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: 'rgba(251,146,60,0.1)', color: '#fb923c' }}
                >
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
                      <span
                        className="badge flex items-center gap-1.5"
                        style={{ background: 'var(--success-muted)', color: 'var(--success)' }}
                      >
                        <Ticket className="w-3 h-3" />
                        {tour.avg_ticket_price.toLocaleString()} ₽ avg
                      </span>
                    )}
                  </div>
                  {tour.band && (
                    <p className="text-[12px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                      {(tour.band as Band).name}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {tour.created_by === user?.id && (
                    <>
                      <Tooltip label="Edit tour">
                        <button onClick={() => openEdit(tour)} className="btn btn-ghost btn-icon" style={{ color: 'var(--text-tertiary)' }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                      <Tooltip label="Delete tour">
                        <button onClick={() => handleDelete(tour.id)} className="btn btn-ghost btn-icon" style={{ color: 'var(--text-tertiary)' }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                    </>
                  )}
                  <Tooltip label={expandedId === tour.id ? 'Collapse' : 'View setlist'}>
                    <button onClick={() => toggleExpand(tour.id)} className="btn btn-ghost btn-icon" style={{ color: 'var(--text-tertiary)' }}>
                      {expandedId === tour.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </Tooltip>
                </div>
              </div>

              {expandedId === tour.id && (
                <div
                  className="px-5 py-4 animate-fade-in"
                  style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Music className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                    <span className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
                      Setlist
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
                  ) : (
                    <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>No songs in setlist</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal
          title={editTour ? 'Edit Tour' : 'New Tour'}
          subtitle={editTour ? `Editing "${editTour.program_name}"` : 'Plan a new tour with dates and setlist'}
          onClose={() => setShowForm(false)}
          size="lg"
          footer={
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="btn btn-ghost">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                {saving ? 'Saving...' : editTour ? 'Save Changes' : 'Create Tour'}
              </button>
            </div>
          }
        >
          <div className="space-y-5">
            <div>
              <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Program Name *</label>
              <input autoFocus className="input-base" value={form.program_name} onChange={e => setForm({ ...form, program_name: e.target.value })} placeholder="World Tour 2025" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>City</label>
                <input className="input-base" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Moscow" />
              </div>
              <div>
                <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Avg. Ticket Price (₽)</label>
                <input type="number" min="0" step="100" className="input-base" value={form.avg_ticket_price} onChange={e => setForm({ ...form, avg_ticket_price: e.target.value })} placeholder="2500" />
              </div>
              <div>
                <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Start Date</label>
                <input type="date" className="input-base" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>End Date</label>
                <input type="date" className="input-base" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Band *</label>
              <select
                className="input-base"
                value={form.band_id}
                onChange={e => setForm({ ...form, band_id: e.target.value })}
              >
                <option value="">Select a band</option>
                {bands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            {songs.length > 0 && (
              <div>
                <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Setlist <span style={{ color: 'var(--text-tertiary)' }}>({selectedSongs.length} songs)</span>
                </label>
                <div
                  className="max-h-36 overflow-y-auto rounded-xl p-2 space-y-0.5"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-base)' }}
                >
                  {songs.map(s => (
                    <label
                      key={s.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer"
                      style={{ background: selectedSongs.includes(s.id) ? 'rgba(96,165,250,0.08)' : 'transparent' }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSongs.includes(s.id)}
                        onChange={() => setSelectedSongs(prev => prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id])}
                        className="w-4 h-4 accent-indigo-500"
                      />
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
    </div>
  );
}
