import { useEffect, useState, useCallback } from 'react';
import { adminApi, User, AdminStats } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { toast } from 'sonner';
import {
  Shield, Users, Ban, Unlock, Trash2, ChevronDown, BarChart3,
  Mail, Calendar, Crown, Mic2, Briefcase,
} from 'lucide-react';

const ROLE_CONFIG = {
  admin:   { label: 'Администратор', color: 'var(--error)',   bg: 'var(--error-muted)',   icon: <Crown className="w-3 h-3" /> },
  manager: { label: 'Менеджер',      color: 'var(--accent)',  bg: 'var(--accent-muted)',  icon: <Briefcase className="w-3 h-3" /> },
  artist:  { label: 'Артист',        color: '#34d399',        bg: 'rgba(52,211,153,0.1)', icon: <Mic2 className="w-3 h-3" /> },
};

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG] ?? ROLE_CONFIG.manager;
  return (
    <span className="badge flex items-center gap-1" style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [u, s] = await Promise.all([adminApi.getUsers(), adminApi.getStats()]);
      setUsers(u);
      setStats(s);
    } catch {
      toast.error('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const updated = await adminApi.updateUser(userId, { role: newRole });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: updated.role } : u));
      toast.success('Роль изменена');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка');
    }
    setEditingRoleId(null);
  };

  const handleBlock = async (user: User) => {
    try {
      if (user.is_blocked) {
        await adminApi.unblockUser(user.id);
        toast.success(`Пользователь ${user.email} разблокирован`);
      } else {
        await adminApi.blockUser(user.id);
        toast.success(`Пользователь ${user.email} заблокирован`);
      }
      await fetchAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminApi.deleteUser(deleteTarget.id);
      toast.success('Пользователь удалён');
      await fetchAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setDeleteTarget(null);
    }
  };

  const formatDate = (dt?: string) => {
    if (!dt) return '—';
    return new Date(dt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Админ-панель
        </h1>
        <p className="text-[13.5px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Управление пользователями системы
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Пользователей',    value: stats.users.total,    icon: <Users className="w-4 h-4" />,    color: 'var(--accent)' },
            { label: 'Заблокировано',    value: stats.users.blocked,  icon: <Ban className="w-4 h-4" />,      color: 'var(--error)' },
            { label: 'Открытых тикетов', value: stats.tickets.open,   icon: <BarChart3 className="w-4 h-4" />, color: 'var(--warning)' },
            { label: 'Новых запросов',   value: stats.messages.unread, icon: <Mail className="w-4 h-4" />,    color: '#f472b6' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <span style={{ color }}>{icon}</span>
                <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{label}</span>
              </div>
              <p className="text-[24px] font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{ borderBottom: '1px solid var(--glass-border)' }}
        >
          <Shield className="w-4 h-4" style={{ color: 'var(--error)' }} />
          <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Список пользователей ({users.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="flex items-center gap-4">
                <div className="skeleton flex-shrink-0" style={{ width: 36, height: 36, borderRadius: 10 }} />
                <div className="flex-1 space-y-2">
                  <div className="skeleton" style={{ width: '40%', height: 14 }} />
                  <div className="skeleton" style={{ width: '25%', height: 12 }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  {['Пользователь', 'Роль', 'Статус', 'Дата регистрации', 'Действия'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[11.5px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="table-row-hover transition-colors" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-[12px] font-bold text-white"
                            style={{ background: u.is_blocked ? 'var(--text-tertiary)' : 'var(--accent)', opacity: u.is_blocked ? 0.5 : 1 }}
                          >
                            {(u.name || u.email).slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-[14px] font-medium" style={{ color: u.is_blocked ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>
                              {u.name || '—'}
                              {isSelf && <span className="ml-1.5 badge" style={{ background: 'var(--accent-muted)', color: 'var(--accent)', fontSize: 10 }}>Вы</span>}
                            </p>
                            <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{u.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {isSelf ? (
                          <RoleBadge role={u.role} />
                        ) : (
                          <div className="relative inline-block">
                            <button
                              onClick={() => setEditingRoleId(editingRoleId === u.id ? null : u.id)}
                              className="flex items-center gap-1.5 btn btn-ghost text-[12.5px] py-1 px-2"
                            >
                              <RoleBadge role={u.role} />
                              <ChevronDown className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} />
                            </button>
                            {editingRoleId === u.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setEditingRoleId(null)} />
                                <div className="absolute left-0 top-full mt-1 z-20 glass-dropdown rounded-xl overflow-hidden py-1" style={{ minWidth: 160 }}>
                                  {(['manager', 'artist', 'admin'] as const).map(r => (
                                    <button
                                      key={r}
                                      onClick={() => handleRoleChange(u.id, r)}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-left transition-colors"
                                      style={{ color: u.role === r ? 'var(--accent)' : 'var(--text-primary)' }}
                                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                    >
                                      <RoleBadge role={r} />
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className="badge"
                          style={u.is_blocked
                            ? { background: 'var(--error-muted)', color: 'var(--error)' }
                            : { background: 'var(--success-muted)', color: 'var(--success)' }
                          }
                        >
                          {u.is_blocked ? 'Заблокирован' : 'Активен'}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(u.created_at)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {!isSelf && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleBlock(u)}
                              className="btn btn-ghost btn-icon"
                              title={u.is_blocked ? 'Разблокировать' : 'Заблокировать'}
                            >
                              {u.is_blocked
                                ? <Unlock className="w-4 h-4" style={{ color: 'var(--success)' }} />
                                : <Ban className="w-4 h-4" style={{ color: 'var(--warning)' }} />
                              }
                            </button>
                            <button
                              onClick={() => setDeleteTarget(u)}
                              className="btn btn-ghost btn-icon"
                              title="Удалить пользователя"
                            >
                              <Trash2 className="w-4 h-4" style={{ color: 'var(--error)' }} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title="Удалить пользователя?"
          description={`Вы уверены, что хотите удалить пользователя ${deleteTarget.email}? Все данные будут безвозвратно удалены.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
