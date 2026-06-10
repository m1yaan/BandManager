import { useEffect, useState, useCallback } from 'react';
import { adminApi, User, AdminStats, Band, Singer, Song, Tour, Message } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { toast } from 'sonner';
import {
  Shield, Users, Ban, Unlock, Trash2, ChevronDown, BarChart3,
  Mail, Calendar, Crown, Mic2, Briefcase, Eye, X,
  Music2, Radio, MapPin, MessageSquare, ArrowLeft,
} from 'lucide-react';
import { NavigateFn } from '../../App';

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

// Детальный просмотр данных пользователя (Задача 6)
type UserDetailTab = 'bands' | 'singers' | 'songs' | 'tours' | 'messages';

function UserDetailsModal({ user, onClose }: { user: User; onClose: () => void }) {
  const [tab, setTab] = useState<UserDetailTab>('bands');
  const [data, setData] = useState<{
    bands: Band[]; singers: Singer[]; songs: Song[]; tours: Tour[]; messages: Message[];
  }>({ bands: [], singers: [], songs: [], tours: [], messages: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [bands, singers, songs, tours, messages] = await Promise.all([
          adminApi.getUserBands(user.id),
          adminApi.getUserSingers(user.id),
          adminApi.getUserSongs(user.id),
          adminApi.getUserTours(user.id),
          adminApi.getUserMessages(user.id),
        ]);
        setData({ bands, singers, songs, tours, messages });
      } catch (err) {
        console.error(err);
        toast.error('Ошибка загрузки данных');
      } finally { setLoading(false); }
    };
    fetchAll();
  }, [user.id]);

  const TABS: { id: UserDetailTab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'bands',    label: 'Группы',       icon: <Music2 className="w-4 h-4" />,       count: data.bands.length },
    { id: 'singers',  label: 'Исполнители',  icon: <Mic2 className="w-4 h-4" />,          count: data.singers.length },
    { id: 'songs',    label: 'Песни',        icon: <Radio className="w-4 h-4" />,          count: data.songs.length },
    { id: 'tours',    label: 'Туры',         icon: <MapPin className="w-4 h-4" />,         count: data.tours.length },
    { id: 'messages', label: 'Сообщения',    icon: <MessageSquare className="w-4 h-4" />,  count: data.messages.length },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 animate-fade-in"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
        onClick={onClose} />
      <div className="relative w-full max-w-3xl glass-modal rounded-2xl max-h-[90vh] flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--glass-border)' }}>
          <div>
            <h2 className="text-[16px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              Данные пользователя
            </h2>
            <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {user.name || '—'} · {user.email}
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--glass-border)' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="px-3 py-2 text-[13px] font-medium transition-colors flex items-center gap-1.5"
              style={{
                color: tab === t.id ? 'var(--accent)' : 'var(--text-secondary)',
                borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {t.icon}{t.label}
              {t.count > 0 && (
                <span className="badge" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="skeleton" style={{ height: 48, borderRadius: 12 }} />
              ))}
            </div>
          ) : (
            <>
              {tab === 'bands' && (
                data.bands.length === 0 ? (
                  <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Нет групп</p>
                ) : (
                  <div className="space-y-2">
                    {data.bands.map(b => (
                      <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl"
                        style={{ background: 'var(--bg-elevated)' }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                          <Music2 className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[13.5px] font-medium" style={{ color: 'var(--text-primary)' }}>{b.name}</p>
                          <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                            {[b.country, b.foundation_year && `Осн. ${b.foundation_year}`].filter(Boolean).join(' · ') || '—'}
                          </p>
                        </div>
                        {b.rating != null && (
                          <span className="badge" style={{ background: 'rgba(251,191,36,0.1)', color: 'var(--warning)' }}>
                            ★ {b.rating}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}

              {tab === 'singers' && (
                data.singers.length === 0 ? (
                  <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Нет исполнителей</p>
                ) : (
                  <div className="space-y-2">
                    {data.singers.map(s => (
                      <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl"
                        style={{ background: 'var(--bg-elevated)' }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399' }}>
                          <Mic2 className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[13.5px] font-medium" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
                          <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{s.country || '—'}</p>
                        </div>
                        {s.rating != null && (
                          <span className="badge" style={{ background: 'rgba(251,191,36,0.1)', color: 'var(--warning)' }}>
                            ★ {s.rating}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}

              {tab === 'songs' && (
                data.songs.length === 0 ? (
                  <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Нет песен</p>
                ) : (
                  <div className="space-y-2">
                    {data.songs.map(s => (
                      <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl"
                        style={{ background: 'var(--bg-elevated)' }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa' }}>
                          <Radio className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[13.5px] font-medium" style={{ color: 'var(--text-primary)' }}>{s.title}</p>
                          <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                            {s.composer_name || s.composer || '—'}
                          </p>
                        </div>
                        {s.release_date && (
                          <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                            {new Date(s.release_date).getFullYear()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}

              {tab === 'tours' && (
                data.tours.length === 0 ? (
                  <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Нет туров</p>
                ) : (
                  <div className="space-y-2">
                    {data.tours.map(t => (
                      <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl"
                        style={{ background: 'var(--bg-elevated)' }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: 'rgba(251,146,60,0.1)', color: '#fb923c' }}>
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[13.5px] font-medium" style={{ color: 'var(--text-primary)' }}>
                            {t.program_name}
                          </p>
                          <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                            {t.city}
                            {t.start_date && ` · ${new Date(t.start_date).toLocaleDateString('ru-RU')}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {tab === 'messages' && (
                data.messages.length === 0 ? (
                  <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Нет сообщений</p>
                ) : (
                  <div className="space-y-2">
                    {data.messages.map(m => (
                      <div key={m.id} className="p-3 rounded-xl"
                        style={{ background: 'var(--bg-elevated)' }}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[13.5px] font-medium" style={{ color: 'var(--text-primary)' }}>
                            {m.sender_name}
                          </p>
                          <span className="badge" style={{
                            background: m.status === 'accepted' ? 'var(--success-muted)' :
                              m.status === 'declined' ? 'var(--error-muted)' :
                              m.status === 'deferred' ? 'var(--warning-muted)' : 'var(--info-muted)',
                            color: m.status === 'accepted' ? 'var(--success)' :
                              m.status === 'declined' ? 'var(--error)' :
                              m.status === 'deferred' ? 'var(--warning)' : 'var(--info)',
                          }}>
                            {m.status === 'accepted' ? 'Принято' :
                             m.status === 'declined' ? 'Отклонено' :
                             m.status === 'deferred' ? 'Отложено' : 'Новое'}
                          </span>
                        </div>
                        <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                          {m.organization} · {m.city}
                          {(m.band_name || m.singer_name) && ` · ${m.band_name || m.singer_name}`}
                        </p>
                      </div>
                    ))}
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Основная страница AdminUsersPage ──────────────────────────────────────────
type Props = {
  onNavigate: NavigateFn;
};

export default function AdminUsersPage({ onNavigate: _onNavigate }: Props) {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [u, s] = await Promise.all([adminApi.getUsers(), adminApi.getStats()]);
      setUsers(u);
      setStats(s);
    } catch { toast.error('Ошибка загрузки'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const updated = await adminApi.updateUser(userId, { role: newRole });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: updated.role } : u));
      toast.success('Роль изменена');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Ошибка'); }
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
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Ошибка'); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminApi.deleteUser(deleteTarget.id);
      toast.success('Пользователь удалён');
      await fetchAll();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Ошибка'); }
    finally { setDeleteTarget(null); }
  };

  const formatDate = (dt?: string) => {
    if (!dt) return '—';
    return new Date(dt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Админ-панель</h1>
        <p className="text-[13.5px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>Управление пользователями системы</p>
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
        <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--glass-border)' }}>
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
                    <th key={h} className="text-left px-5 py-3 text-[11.5px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-tertiary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="table-row-hover transition-colors"
                      style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-[12px] font-bold text-white"
                            style={{ background: u.is_blocked ? 'var(--text-tertiary)' : 'var(--accent)', opacity: u.is_blocked ? 0.5 : 1 }}>
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
                        {isSelf ? <RoleBadge role={u.role} /> : (
                          <div className="relative inline-block">
                            <button onClick={() => setEditingRoleId(editingRoleId === u.id ? null : u.id)}
                              className="flex items-center gap-1.5 btn btn-ghost text-[12.5px] py-1 px-2">
                              <RoleBadge role={u.role} />
                              <ChevronDown className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} />
                            </button>
                            {editingRoleId === u.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setEditingRoleId(null)} />
                                <div className="absolute left-0 top-full mt-1 z-20 glass-dropdown rounded-xl overflow-hidden py-1"
                                  style={{ minWidth: 160 }}>
                                  {(['manager', 'artist', 'admin'] as const).map(r => (
                                    <button key={r} onClick={() => handleRoleChange(u.id, r)}
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
                        <span className="badge" style={u.is_blocked
                          ? { background: 'var(--error-muted)', color: 'var(--error)' }
                          : { background: 'var(--success-muted)', color: 'var(--success)' }
                        }>
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
                        <div className="flex items-center gap-1.5">
                          {/* Задача 6: кнопка просмотра данных */}
                          <button onClick={() => setViewingUser(u)}
                            className="btn btn-ghost btn-icon" title="Просмотреть данные">
                            <Eye className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                          </button>
                          {!isSelf && (
                            <>
                              <button onClick={() => handleBlock(u)} className="btn btn-ghost btn-icon"
                                title={u.is_blocked ? 'Разблокировать' : 'Заблокировать'}>
                                {u.is_blocked
                                  ? <Unlock className="w-4 h-4" style={{ color: 'var(--success)' }} />
                                  : <Ban className="w-4 h-4" style={{ color: 'var(--warning)' }} />
                                }
                              </button>
                              <button onClick={() => setDeleteTarget(u)} className="btn btn-ghost btn-icon"
                                title="Удалить пользователя">
                                <Trash2 className="w-4 h-4" style={{ color: 'var(--error)' }} />
                              </button>
                            </>
                          )}
                        </div>
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

      {/* Задача 6: модальное окно с данными пользователя */}
      {viewingUser && (
        <UserDetailsModal user={viewingUser} onClose={() => setViewingUser(null)} />
      )}
    </div>
  );
}