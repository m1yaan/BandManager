import { useEffect, useState, useCallback } from 'react';
import { messagesApi, Message } from '../../lib/api';
import { MessageSquare, ArrowRight } from 'lucide-react';

type Props = {
  onNavigate: () => void;
};

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
function getAvatarColor(name: string): string {
  const colors = ['#6366f1', '#a78bfa', '#34d399', '#60a5fa', '#fb923c', '#f472b6', '#fbbf24'];
  return colors[name.charCodeAt(0) % colors.length];
}
function getPreview(text: string, maxLen = 55): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
}
function formatTime(dt: string): string {
  const d = new Date(dt);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1)    return 'только что';
  if (diffMin < 60)   return `${diffMin} мин.`;
  if (diffMin < 1440) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export function RecentMessagesWidget({ onNavigate }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecent = useCallback(async () => {
    try {
      // Задача 9: только NEW сообщения
      const data = await messagesApi.getRecent();
      setMessages(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRecent(); }, [fetchRecent]);

  return (
    <div className="glass-card overflow-hidden animate-fade-in" style={{ animationDelay: '420ms' }}>
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid var(--glass-border)' }}
      >
        <div className="flex items-center gap-2.5">
          <MessageSquare className="w-4 h-4" style={{ color: '#f472b6' }} />
          <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Последние сообщения
          </h2>
        </div>
        <button
          onClick={onNavigate}
          className="flex items-center gap-1.5 text-[12.5px] font-medium transition-colors"
          style={{ color: 'var(--accent)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-hover)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--accent)')}
        >
          Открыть все
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="px-6 py-4 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className="skeleton flex-shrink-0" style={{ width: 36, height: 36, borderRadius: 10 }} />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton" style={{ width: '45%', height: 13 }} />
                <div className="skeleton" style={{ width: '70%', height: 12 }} />
              </div>
              <div className="skeleton" style={{ width: 40, height: 12 }} />
            </div>
          ))}
        </div>
      ) : messages.length === 0 ? (
        // Задача 9: пустой стейт для "нет новых"
        <div className="px-6 py-8 flex flex-col items-center text-center">
          <MessageSquare className="w-7 h-7 mb-2 opacity-30" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
            Нет новых сообщений
          </p>
        </div>
      ) : (
        <div>
          {messages.map((msg, i) => (
            <button
              key={msg.id}
              onClick={onNavigate}
              className="w-full flex items-center gap-3 px-6 py-3.5 text-left transition-colors"
              style={{ borderBottom: i < messages.length - 1 ? '1px solid var(--glass-border)' : 'none' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
            >
              {msg.avatar_url ? (
                <img src={msg.avatar_url} alt={msg.sender_name} className="w-9 h-9 rounded-[10px] object-cover flex-shrink-0" />
              ) : (
                <div
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 text-[12px] font-bold text-white"
                  style={{ background: getAvatarColor(msg.sender_name) }}
                >
                  {getInitials(msg.sender_name)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {msg.sender_name}
                </p>
                <p className="text-[12px] truncate" style={{ color: 'var(--text-secondary)' }}>
                  {getPreview(msg.message_text)}
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                  {formatTime(msg.created_at)}
                </p>
                {/* Индикатор нового */}
                <div className="w-2 h-2 rounded-full mt-1 ml-auto" style={{ background: 'var(--accent)' }} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
