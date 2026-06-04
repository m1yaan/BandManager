import { useEffect, useState, memo, useCallback } from 'react';
import { singersApi, Singer } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { Tooltip } from '../components/Tooltip';
import { SkeletonList } from '../components/Skeleton';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Plus, Pencil, Trash2, Mic2 } from 'lucide-react';
import { toast } from 'sonner';

type SingerCardProps = {
  singer: Singer;
  isOwner: boolean;
  onEdit: (s: Singer) => void;
  onDelete: (s: Singer) => void;
};

const SingerCard = memo(({ singer, isOwner, onEdit, onDelete }: SingerCardProps) => (
  <div className="card card-hover p-4 flex items-center gap-3.5 group transition-all">
    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399' }}>
      <Mic2 className="w-4 h-4" />
    </div>
    <span className="flex-1 text-[14px] font-medium truncate min-w-0" style={{ color: 'var(--text-primary)' }}>
      {singer.name}
    </span>
    {isOwner && (
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Tooltip label="Редактировать">
          <button onClick={() => onEdit(singer)} className="btn btn-ghost btn-icon" style={{ color: 'var(--text-tertiary)' }}>
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </Tooltip>
        <Tooltip label="Удалить">
          <button onClick={() => onDelete(singer)} className="btn btn-ghost btn-icon" style={{ color: 'var(--text-tertiary)' }}>
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
  const [deleteTarget, setDeleteTarget] = useState<Singer | null>(null);
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
    if (!name.trim()) { setError('Имя обязательно'); return; }
    setSaving(true); setError('');
    try {
      if (editSinger) {
        await singersApi.update(editSinger.id, name.trim());
        toast.success('Исполнитель обновлён');
      } else {
        await singersApi.create(name.trim());
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
            />
          ))}
        </div>
      )}

      {showForm && (
        <Modal
          title={editSinger ? 'Редактировать исполнителя' : 'Новый исполнитель'}
          subtitle={editSinger ? `Редактирование: ${editSinger.name}` : 'Добавить исполнителя в базу'}
          onClose={() => setShowForm(false)}
          size="sm"
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
              <input autoFocus className="input-base" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()} placeholder="Имя исполнителя" />
            </div>
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