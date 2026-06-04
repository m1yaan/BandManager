import { useEffect, useState, useCallback } from 'react';
import { bandsApi, singersApi, songsApi, Band, Singer, Song } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { Tooltip } from '../components/Tooltip';
import { SkeletonList } from '../components/Skeleton';
import { Plus, Pencil, Trash2, Star, Users, Music, ChevronDown, ChevronUp, Music2 } from 'lucide-react';

type BandWithDetails = Band & { members?: Singer[]; repertoire?: Song[] };

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

  const fetchBands = useCallback(async () => {
    try { setBands(await bandsApi.getAll()); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchBands();
    Promise.all([singersApi.getAll(), songsApi.getAll()])
      .then(([s, so]) => { setSingers(s); setSongs(so); })
      .catch(console.error);
  }, [fetchBands]);

  const toggleExpand = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    try {
      const details = await bandsApi.getDetails(id);
      setBands(prev => prev.map(b => b.id === id ? { ...b, ...details } : b));
    } catch (err) { console.error(err); }
  };

  const openAdd = () => {
    setEditBand(null);
    setForm({ name: '', foundation_year: '', country: '', rating: '' });
    setSelectedMembers([]); setSelectedRepertoire([]);
    setError(''); setShowForm(true);
  };

  const openEdit = async (band: Band) => {
    setEditBand(band);
    setForm({
      name: band.name,
      foundation_year: band.foundation_year?.toString() ?? '',
      country: band.country,
      rating: band.rating?.toString() ?? '',
    });
    try {
      const d = await bandsApi.getDetails(band.id);
      setSelectedMembers(d.members.map(m => m.id));
      setSelectedRepertoire(d.repertoire.map(s => s.id));
    } catch { setSelectedMembers([]); setSelectedRepertoire([]); }
    setError(''); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Band name is required'); return; }
    setSaving(true); setError('');
    const payload = {
      name: form.name.trim(),
      foundation_year: form.foundation_year ? parseInt(form.foundation_year) : null,
      country: form.country.trim(),
      rating: form.rating ? parseFloat(form.rating) : null,
      memberIds: selectedMembers,
      songIds: selectedRepertoire,
    };
    try {
      if (editBand) await bandsApi.update(editBand.id, payload);
      else await bandsApi.create(payload);
      await fetchBands(); setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this band?')) return;
    try { await bandsApi.delete(id); await fetchBands(); }
    catch (err) { console.error(err); }
  };

  const toggleSelect = (id: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Bands</h1>
          <p className="text-[13.5px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {bands.length} {bands.length === 1 ? 'band' : 'bands'} managed
          </p>
        </div>
        <button onClick={openAdd} className="btn btn-primary">
          <Plus className="w-4 h-4" /> Add Band
        </button>
      </div>

      {loading ? <SkeletonList rows={3} /> : bands.length === 0 ? (
        <EmptyState
          icon={<Music2 className="w-5 h-5" />}
          title="No bands yet"
          description="Create your first band to start managing your roster"
          action={<button onClick={openAdd} className="btn btn-primary"><Plus className="w-4 h-4" /> Add Band</button>}
        />
      ) : (
        <div className="space-y-3">
          {bands.map(band => (
            <div key={band.id} className="card overflow-hidden">
              <div className="flex items-center gap-4 px-5 py-4">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}
                >
                  <Music2 className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3
                      className="text-[14.5px] font-semibold truncate"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {band.name}
                    </h3>
                    {band.rating != null && (
                      <span
                        className="badge flex items-center gap-1"
                        style={{ background: 'rgba(251,191,36,0.12)', color: 'var(--warning)' }}
                      >
                        <Star className="w-3 h-3 fill-current" />
                        {band.rating}
                      </span>
                    )}
                  </div>
                  <p className="text-[12.5px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    {[band.country, band.foundation_year && `Est. ${band.foundation_year}`].filter(Boolean).join(' · ') || 'No details'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {band.created_by === user?.id && (
                    <>
                      <Tooltip label="Edit band">
                        <button onClick={() => openEdit(band)} className="btn btn-ghost btn-icon" style={{ color: 'var(--text-tertiary)' }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                      <Tooltip label="Delete band">
                        <button onClick={() => handleDelete(band.id)} className="btn btn-ghost btn-icon" style={{ color: 'var(--text-tertiary)' }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                    </>
                  )}
                  <Tooltip label={expandedId === band.id ? 'Collapse' : 'Expand'}>
                    <button onClick={() => toggleExpand(band.id)} className="btn btn-ghost btn-icon" style={{ color: 'var(--text-tertiary)' }}>
                      {expandedId === band.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </Tooltip>
                </div>
              </div>

              {expandedId === band.id && (
                <div
                  className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in"
                  style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                      <span className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Members</span>
                    </div>
                    {band.members && band.members.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {band.members.map(m => (
                          <span key={m.id} className="badge" style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399' }}>
                            {m.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>No members added</p>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Music className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                      <span className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Repertoire</span>
                    </div>
                    {band.repertoire && band.repertoire.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {band.repertoire.map(s => (
                          <span key={s.id} className="badge" style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa' }}>
                            {s.title}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>No songs in repertoire</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal
          title={editBand ? 'Edit Band' : 'New Band'}
          subtitle={editBand ? `Editing ${editBand.name}` : 'Create a new band and configure its lineup'}
          onClose={() => setShowForm(false)}
          size="lg"
          footer={
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="btn btn-ghost">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                {saving ? 'Saving...' : editBand ? 'Save Changes' : 'Create Band'}
              </button>
            </div>
          }
        >
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Band Name *</label>
                <input autoFocus className="input-base" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. The Rolling Stones" />
              </div>
              <div>
                <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Founded</label>
                <input type="number" min="1900" max="2030" className="input-base" value={form.foundation_year} onChange={e => setForm({ ...form, foundation_year: e.target.value })} placeholder="2000" />
              </div>
              <div>
                <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Country</label>
                <input className="input-base" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} placeholder="United Kingdom" />
              </div>
              <div>
                <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Rating (1–10)</label>
                <input type="number" min="1" max="10" step="0.1" className="input-base" value={form.rating} onChange={e => setForm({ ...form, rating: e.target.value })} placeholder="8.5" />
              </div>
            </div>

            {singers.length > 0 && (
              <div>
                <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Members <span style={{ color: 'var(--text-tertiary)' }}>({selectedMembers.length} selected)</span>
                </label>
                <div
                  className="max-h-36 overflow-y-auto rounded-xl p-2 space-y-0.5"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-base)' }}
                >
                  {singers.map(s => (
                    <label
                      key={s.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors"
                      style={{ background: selectedMembers.includes(s.id) ? 'rgba(52,211,153,0.08)' : 'transparent' }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(s.id)}
                        onChange={() => toggleSelect(s.id, selectedMembers, setSelectedMembers)}
                        className="w-4 h-4 accent-indigo-500"
                      />
                      <span className="text-[13.5px]" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {songs.length > 0 && (
              <div>
                <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Repertoire <span style={{ color: 'var(--text-tertiary)' }}>({selectedRepertoire.length} selected)</span>
                </label>
                <div
                  className="max-h-36 overflow-y-auto rounded-xl p-2 space-y-0.5"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-base)' }}
                >
                  {songs.map(s => (
                    <label
                      key={s.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors"
                      style={{ background: selectedRepertoire.includes(s.id) ? 'rgba(96,165,250,0.08)' : 'transparent' }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedRepertoire.includes(s.id)}
                        onChange={() => toggleSelect(s.id, selectedRepertoire, setSelectedRepertoire)}
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
