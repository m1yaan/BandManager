import { useCallback, useEffect, useState } from 'react';
import { adminApi, AuditLogEntry, User } from '../../lib/api';
import { toast } from 'sonner';
import {
  ScrollText, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Filter, X,
} from 'lucide-react';

const ENTITY_TYPES = [
  { value: '', label: 'Все типы' },
  { value: 'band', label: 'Группа' },
  { value: 'singer', label: 'Исполнитель' },
  { value: 'song', label: 'Песня' },
  { value: 'tour', label: 'Тур' },
  { value: 'tour_stop', label: 'Остановка' },
  { value: 'rider_checklist', label: 'Райдер' },
  { value: 'message', label: 'Сообщение' },
];

const ACTIONS = [
  { value: '', label: 'Все действия' },
  { value: 'CREATE', label: 'Создание' },
  { value: 'UPDATE', label: 'Изменение' },
  { value: 'DELETE', label: 'Удаление' },
];

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Создание',
  UPDATE: 'Изменение',
  DELETE: 'Удаление',
};

const ACTION_COLORS: Record<string, { bg: string; color: string }> = {
  CREATE: { bg: 'var(--success-muted)', color: 'var(--success)' },
  UPDATE: { bg: 'var(--accent-muted)', color: 'var(--accent)' },
  DELETE: { bg: 'var(--error-muted)', color: 'var(--error)' },
};

const ENTITY_LABELS: Record<string, string> = {
  band: 'Группа',
  singer: 'Исполнитель',
  song: 'Песня',
  tour: 'Тур',
  tour_stop: 'Остановка',
  rider_checklist: 'Райдер',
  message: 'Сообщение',
};

function formatDateTime(dt: string) {
  return new Date(dt).toLocaleString('ru-RU', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function JsonBlock({ label, data, variant }: {
  label: string;
  data: Record<string, unknown> | null;
  variant: 'old' | 'new';
}) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5"
          style={{ color: 'var(--text-tertiary)' }}>{label}</p>
        <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>—</p>
      </div>
    );
  }

  const borderColor = variant === 'old' ? 'var(--error)' : 'var(--success)';

  return (
    <div className="flex-1 min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5"
        style={{ color: 'var(--text-tertiary)' }}>{label}</p>
      <pre
        className="text-[11.5px] leading-relaxed p-3 rounded-xl overflow-x-auto"
        style={{
          background: 'var(--bg-elevated)',
          border: `1px solid ${borderColor}`,
          color: 'var(--text-primary)',
          maxHeight: 240,
        }}
      >
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

function DiffKeys({ oldValues, newValues }: {
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
}) {
  const oldObj = oldValues ?? {};
  const newObj = newValues ?? {};
  const keys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));

  const changed = keys.filter(k => JSON.stringify(oldObj[k]) !== JSON.stringify(newObj[k]));
  if (changed.length === 0) return null;

  return (
    <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
      <p className="text-[11px] font-semibold uppercase tracking-wide mb-2"
        style={{ color: 'var(--text-tertiary)' }}>Изменённые поля</p>
      <div className="flex flex-wrap gap-1.5">
        {changed.map(key => (
          <span key={key} className="badge text-[11px]"
            style={{ background: 'var(--warning-muted)', color: 'var(--warning)' }}>
            {key}
          </span>
        ))}
      </div>
    </div>
  );
}

function AuditRow({ entry }: { entry: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const actionStyle = ACTION_COLORS[entry.action] ?? ACTION_COLORS.UPDATE;

  return (
    <>
      <tr
        className="table-row-hover transition-colors cursor-pointer"
        style={{ borderBottom: '1px solid var(--glass-border)' }}
        onClick={() => setExpanded(v => !v)}
      >
        <td className="px-5 py-3.5 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          {formatDateTime(entry.created_at)}
        </td>
        <td className="px-5 py-3.5 text-[13px]" style={{ color: 'var(--text-primary)' }}>
          {entry.user_email}
        </td>
        <td className="px-5 py-3.5">
          <span className="badge text-[11px]" style={{ background: actionStyle.bg, color: actionStyle.color }}>
            {ACTION_LABELS[entry.action] ?? entry.action}
          </span>
        </td>
        <td className="px-5 py-3.5 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          {ENTITY_LABELS[entry.entity_type] ?? entry.entity_type}
        </td>
        <td className="px-5 py-3.5 text-[12px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
          {entry.entity_id ? `${entry.entity_id.slice(0, 8)}…` : '—'}
        </td>
        <td className="px-5 py-3.5 text-right">
          {expanded
            ? <ChevronUp className="w-4 h-4 inline" style={{ color: 'var(--text-tertiary)' }} />
            : <ChevronDown className="w-4 h-4 inline" style={{ color: 'var(--text-tertiary)' }} />
          }
        </td>
      </tr>
      {expanded && (
        <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
          <td colSpan={6} className="px-5 py-4" style={{ background: 'var(--bg-subtle)' }}>
            <div className="flex flex-col lg:flex-row gap-4">
              <JsonBlock label="Было (old_values)" data={entry.old_values} variant="old" />
              <JsonBlock label="Стало (new_values)" data={entry.new_values} variant="new" />
            </div>
            <DiffKeys oldValues={entry.old_values} newValues={entry.new_values} />
            {(entry.ip_address || entry.user_agent) && (
              <div className="mt-3 flex flex-wrap gap-4 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                {entry.ip_address && <span>IP: {entry.ip_address}</span>}
                {entry.user_agent && <span className="truncate max-w-md">UA: {entry.user_agent}</span>}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export default function AdminAuditPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    userId: '',
    entityType: '',
    action: '',
    from: '',
    to: '',
  });

  useEffect(() => {
    adminApi.getUsers().then(setUsers).catch(console.error);
  }, []);

  const fetchLog = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAuditLog({
        userId: filters.userId || undefined,
        entityType: filters.entityType || undefined,
        action: filters.action || undefined,
        from: filters.from ? `${filters.from}T00:00:00.000Z` : undefined,
        to: filters.to ? `${filters.to}T23:59:59.999Z` : undefined,
        page,
        limit: 20,
      });
      setItems(res.items);
      setPages(res.pages);
      setTotal(res.total);
    } catch {
      toast.error('Ошибка загрузки журнала');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { fetchLog(); }, [fetchLog]);

  const resetFilters = () => {
    setFilters({ userId: '', entityType: '', action: '', from: '', to: '' });
    setPage(1);
  };

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight flex items-center gap-2"
          style={{ color: 'var(--text-primary)' }}>
          <ScrollText className="w-6 h-6" style={{ color: 'var(--accent)' }} />
          Журнал действий
        </h1>
        <p className="text-[13.5px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          История CREATE / UPDATE / DELETE операций пользователей
        </p>
      </div>

      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Filter className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
          <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>Фильтры</span>
          {hasFilters && (
            <button onClick={resetFilters} className="btn btn-ghost text-[12px] ml-auto py-1 px-2">
              <X className="w-3.5 h-3.5" /> Сбросить
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <select className="input-base text-[13px]" style={{ padding: '8px 12px' }}
            value={filters.userId}
            onChange={e => { setFilters(f => ({ ...f, userId: e.target.value })); setPage(1); }}>
            <option value="">Все пользователи</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.email}</option>
            ))}
          </select>
          <select className="input-base text-[13px]" style={{ padding: '8px 12px' }}
            value={filters.entityType}
            onChange={e => { setFilters(f => ({ ...f, entityType: e.target.value })); setPage(1); }}>
            {ENTITY_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <select className="input-base text-[13px]" style={{ padding: '8px 12px' }}
            value={filters.action}
            onChange={e => { setFilters(f => ({ ...f, action: e.target.value })); setPage(1); }}>
            {ACTIONS.map(a => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
          <input type="date" className="input-base text-[13px]" style={{ padding: '8px 12px' }}
            value={filters.from}
            onChange={e => { setFilters(f => ({ ...f, from: e.target.value })); setPage(1); }}
            placeholder="От" />
          <input type="date" className="input-base text-[13px]" style={{ padding: '8px 12px' }}
            value={filters.to}
            onChange={e => { setFilters(f => ({ ...f, to: e.target.value })); setPage(1); }}
            placeholder="До" />
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--glass-border)' }}>
          <span className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Записи ({total})
          </span>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton" style={{ height: 44, borderRadius: 12 }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
            Записей не найдено
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  {['Дата', 'Пользователь', 'Действие', 'Тип сущности', 'ID сущности', ''].map(h => (
                    <th key={h || 'expand'} className="text-left px-5 py-3 text-[11.5px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-tertiary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(entry => (
                  <AuditRow key={entry.id} entry={entry} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="px-6 py-4 flex items-center justify-between"
            style={{ borderTop: '1px solid var(--glass-border)' }}>
            <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
              Страница {page} из {pages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn btn-ghost btn-icon"
                style={{ opacity: page <= 1 ? 0.4 : 1 }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="btn btn-ghost btn-icon"
                style={{ opacity: page >= pages ? 0.4 : 1 }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
