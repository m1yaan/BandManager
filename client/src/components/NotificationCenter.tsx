import { useState } from 'react';
import { Bell, Check, CheckCheck, Info, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { Notification } from '../lib/api';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  info:    <Info className="w-4 h-4" style={{ color: 'var(--info)' }} />,
  success: <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--success)' }} />,
  warning: <AlertTriangle className="w-4 h-4" style={{ color: 'var(--warning)' }} />,
  error:   <XCircle className="w-4 h-4" style={{ color: 'var(--error)' }} />,
};

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  const formatTime = (dt: string) => {
    const d = new Date(dt);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diffMin < 1) return 'Только что';
    if (diffMin < 60) return `${diffMin} мин. назад`;
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)} ч. назад`;
    return d.toLocaleDateString('ru-RU');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="btn btn-ghost btn-icon relative"
      >
        <Bell className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
            style={{ background: 'var(--error)' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full mt-2 z-50 w-80 animate-scale-in"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-base)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                <span className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Уведомления
                </span>
                {unreadCount > 0 && (
                  <span className="badge" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                    {unreadCount}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="btn btn-ghost btn-icon"
                  title="Отметить все прочитанными"
                >
                  <CheckCheck className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-tertiary)' }} />
                  <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Нет уведомлений</p>
                </div>
              ) : (
                notifications.map((n: Notification) => (
                  <div
                    key={n.id}
                    className="flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer"
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      background: n.is_read ? 'transparent' : 'var(--accent-muted)',
                    }}
                    onClick={() => !n.is_read && markRead(n.id)}
                    onMouseEnter={e => {
                      if (n.is_read) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-subtle)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.background = n.is_read ? 'transparent' : 'var(--accent-muted)';
                    }}
                  >
                    <div className="flex-shrink-0 mt-0.5">{TYPE_ICONS[n.type] ?? TYPE_ICONS.info}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-medium" style={{ color: 'var(--text-primary)' }}>
                        {n.title}
                      </p>
                      <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {n.message}
                      </p>
                      <p className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                        {formatTime(n.created_at)}
                      </p>
                    </div>
                    {!n.is_read && (
                      <button
                        onClick={e => { e.stopPropagation(); markRead(n.id); }}
                        className="btn btn-ghost btn-icon flex-shrink-0"
                        title="Отметить прочитанным"
                      >
                        <Check className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
