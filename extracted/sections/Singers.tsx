import { useEffect, useState, memo, useCallback } from 'react';
import { singersApi, Singer } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { Tooltip } from '../components/Tooltip';
import { SkeletonList } from '../components/Skeleton';
import { Plus, Pencil, Trash2, Mic2 } from 'lucide-react';

type SingerCardProps = {
  singer: Singer;
  isOwner: boolean;
  onEdit: (s: Singer) => void;
  onDelete: (id: string) => void;
};

const SingerCard = memo(({ singer, isOwner, onEdit, onDelete }: SingerCardProps) => (
  <div
    className="card card-hover p-4 flex items-center gap-3.5 group transition-all"
  >
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399' }}
    >
      <Mic2 className="w-4 h-4" />
    </div>
    <span
      className="flex-1 text-[14px] font-medium truncate min-w-0"
      style={{ color: 'var(--text-primary)' }}
    >
      {singer.name}
    </span>
    {isOwner && (
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Tooltip label="Edit">
          <button
            onClick={() => onEdit(singer)}
            className="btn btn-ghost btn-icon"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </Tooltip>
        <Tooltip label="Delete">
          <button
            onClick={() => onDelete(singer.id)}
            className="btn btn-ghost btn-icon"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </Tooltip>
      </div>
    )}
  </div>
));

SingerCard.displayName = 'SingerCard';

export default function Singers() {
  const { user } = useAuth();
  const [singers, setSingers] = useState<Singer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editSinger, setEditSinger] = useState<Singer | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    try { setSingers(await singersApi.getAll()); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openAdd = () => { setEditSinger(null); setName(''); setError(''); setShowForm(true); };
  const openEdit = (s: Singer) => { setEditSinger(s); setName(s.name); setError(''); setShowForm(true); };

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError('');
    try {
      if (editSinger) await singersApi.update(editSinger.id, name.trim());
      else await singersApi.create(name.trim());
      await fetchAll(); setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this artist?')) return;
    try { await singersApi.delete(id); await fetchAll(); }
    catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Artists</h1>
          <p className="text-[13.5px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {singers.length} {singers.length === 1 ? 'artist' : 'artists'} in roster
          </p>
        </div>
        <button onClick={openAdd} className="btn btn-primary">
          <Plus className="w-4 h-4" /> Add Artist
        </button>
      </div>

      {loading ? <SkeletonList rows={6} /> : singers.length === 0 ? (
        <EmptyState
          icon={<Mic2 className="w-5 h-5" />}
          title="No artists yet"
          description="Add your first artist to get started"
          action={<button onClick={openAdd} className="btn btn-primary"><Plus className="w-4 h-4" /> Add Artist</button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {singers.map(s => (
            <SingerCard
              key={s.id}
              singer={s}
              isOwner={s.created_by === user?.id}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showForm && (
        <Modal
          title={editSinger ? 'Edit Artist' : 'New Artist'}
          subtitle={editSinger ? `Editing ${editSinger.name}` : 'Add a new artist to your roster'}
          onClose={() => setShowForm(false)}
          size="sm"
          footer={
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="btn btn-ghost">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                {saving ? 'Saving...' : editSinger ? 'Save Changes' : 'Add Artist'}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Full Name *
              </label>
              <input
                autoFocus
                className="input-base"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                placeholder="Artist name"
              />
            </div>
            {error && <p className="text-[13px]" style={{ color: 'var(--error)' }}>{error}</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}
