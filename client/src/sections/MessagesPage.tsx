import { useState, useEffect, useCallback } from 'react';
import { messagesApi, bandsApi, singersApi, Message } from '../lib/api';
import { useAutoMessages } from '../hooks/useAutoMessages';
import { useUnreadMessages, notifyUnreadCountChange } from '../hooks/useUnreadMessages';
import Modal from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { toast } from 'sonner';
import {
  MessageSquare, Sparkles, CheckCircle2, XCircle,
  Clock, MapPin, DollarSign, User, Building2, History, Bookmark,
  Search, SortAsc, SortDesc, RefreshCw, Settings, Music2, Mic2,
} from 'lucide-react';

type AutoInterval = 0 | 15 | 30 | 60;

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = ['#6366f1', '#a78bfa', '#34d399', '#60a5fa', '#fb923c', '#f472b6', '#fbbf24'];
  return colors[name.charCodeAt(0) % colors.length];
}

function formatTime(dt: string): string {
  const d = new Date(dt);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1)    return 'только что';
  if (diffMin < 60)   return `${diffMin} мин. назад`;
  if (diffMin < 1440) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function SenderAvatar({ name, avatarUrl }: { name: string; avatarUrl: string }) {
  const initials = getInitials(name);
  if (avatarUrl) {
    return (
      <img src={avatarUrl} alt={name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
    );
  }
  return (
    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-[13px] font-bold text-white"
      style={{ background: getAvatarColor(name) }}>
      {initials}
    </div>
  );
}

const STATUS_MAP = {
  new:      { label: 'Новое',     bg: 'var(--info-muted)',    color: 'var(--info)' },
  deferred: { label: 'Отложено', bg: 'var(--warning-muted)', color: 'var(--warning)' },
  accepted: { label: 'Принято',  bg: 'var(--success-muted)', color: 'var(--success)' },
  declined: { label: 'Отклонено', bg: 'var(--error-muted)',   color: 'var(--error)' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status as keyof typeof STATUS_MAP] ?? STATUS_MAP.new;
  return <span className="badge" style={{ background: s.bg, color: s.color }}>{s.label}</span>;
}

function MessageCard({
  message,
  onAccept,
  onDecline,
  onDefer,
  showActions = true,
}: {
  message: Message;
  onAccept?: (m: Message) => void;
  onDecline?: (m: Message) => void;
  onDefer?: (m: Message) => void;
  showActions?: boolean;
}) {
  const date = message.proposed_date
    ? new Date(message.proposed_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="glass-card p-5 animate-fade-in">
      <div className="flex items-start gap-3 mb-4">
        <SenderAvatar name={message.sender_name} avatarUrl={message.avatar_url} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[14.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              {message.sender_name}
            </p>
            <StatusBadge status={message.status} />
            {message.band_name && (
              <span className="badge" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                🎸 {message.band_name}
              </span>
            )}
            {message.singer_name && !message.band_name && (
              <span className="badge" style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399' }}>
                🎤 {message.singer_name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-[12.5px] flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
              <User className="w-3 h-3" />{message.sender_role}
            </span>
            <span className="text-[12.5px] flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
              <Building2 className="w-3 h-3" />{message.organization}
            </span>
          </div>
        </div>
        <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
          {formatTime(message.created_at)}
        </span>
      </div>

      <p className="text-[13.5px] leading-relaxed mb-4 p-3 rounded-xl"
        style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
        {message.message_text}
      </p>

      <div className="flex flex-wrap gap-3 mb-4">
        {message.city && (
          <span className="flex items-center gap-1.5 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
            <MapPin className="w-3.5 h-3.5" />{message.city}
          </span>
        )}
        {date && (
          <span className="flex items-center gap-1.5 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
            <Clock className="w-3.5 h-3.5" />{date}
          </span>
        )}
        {message.proposed_fee > 0 && (
          <span className="badge flex items-center gap-1.5" style={{ background: 'var(--success-muted)', color: 'var(--success)' }}>
            <DollarSign className="w-3 h-3" />
            {message.proposed_fee.toLocaleString('ru-RU')} ₽
          </span>
        )}
      </div>

      {showActions && (message.status === 'new' || message.status === 'deferred') && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAccept?.(message)}
            className="btn flex-1 text-[13px]"
            style={{ background: 'var(--success-muted)', color: 'var(--success)', border: '1px solid rgba(52,211,153,0.2)' }}
          >
            <CheckCircle2 className="w-4 h-4" />
            Принять
          </button>
          {message.status === 'new' && (
            <button onClick={() => onDefer?.(message)} className="btn btn-ghost" title="Отложить">
              <Bookmark className="w-4 h-4" style={{ color: 'var(--warning)' }} />
            </button>
          )}
          <button onClick={() => onDecline?.(message)} className="btn btn-ghost" title="Отклонить">
            <XCircle className="w-4 h-4" style={{ color: 'var(--error)' }} />
          </button>
        </div>
      )}
    </div>
  );
}

export default function MessagesPage() {
  const [tab, setTab] = useState<'inbox' | 'deferred' | 'history'>('inbox');
  const [messages, setMessages]   = useState<Message[]>([]);
  const [deferred, setDeferred]   = useState<Message[]>([]);
  const [history, setHistory]     = useState<Message[]>([]);
  const [hasEntities, setHasEntities] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [generating, setGenerating] = useState(false);
  const [histFilter, setHistFilter] = useState('all');
  const [histSearch, setHistSearch] = useState('');
  const [histSort, setHistSort]     = useState<'desc' | 'asc'>('desc');
  const [showSettings, setShowSettings] = useState(false);
  const [autoInterval, setAutoInterval] = useState<AutoInterval>(0);
  const [acceptTarget, setAcceptTarget] = useState<Message | null>(null);

  const { refresh: refreshUnread } = useUnreadMessages();

  const fetchMessages = useCallback(async () => {
    try {
      const data = await messagesApi.getAll();
      setMessages(data);
      refreshUnread();
    } catch { /* silent */ } finally { setLoading(false); }
  }, [refreshUnread]);

  const fetchDeferred = useCallback(async () => {
    try {
      const data = await messagesApi.getDeferred();
      setDeferred(data);
    } catch { /* silent */ }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const data = await messagesApi.getHistory({ filter: histFilter, search: histSearch, sort: histSort });
      setHistory(data);
    } catch { /* silent */ }
  }, [histFilter, histSearch, histSort]);

  useEffect(() => {
    fetchMessages();
    Promise.all([bandsApi.getAll(), singersApi.getAll()])
      .then(([bands, singers]) => setHasEntities(bands.length > 0 || singers.length > 0))
      .catch(console.error);
  }, [fetchMessages]);

  useEffect(() => { if (tab === 'deferred') fetchDeferred(); }, [tab, fetchDeferred]);
  useEffect(() => { if (tab === 'history') fetchHistory(); }, [tab, fetchHistory]);

  useAutoMessages(autoInterval, () => { fetchMessages(); toast.info('Новый концертный запрос!'); });

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const created = await messagesApi.generate();
      toast.success(`Сгенерировано ${created.length} сообщений`);
      await fetchMessages();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка генерации');
    }
    finally { setGenerating(false); }
  };

  const handleAccept = async () => {
    if (!acceptTarget) return;
    try {
      const result = await messagesApi.accept(acceptTarget.id);
      notifyUnreadCountChange(result.unreadCount);
      toast.success(result.tour ? `Принято. Тур "${result.tour.program_name}" создан` : 'Запрос принят');
      setAcceptTarget(null);
      await fetchMessages();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Ошибка'); }
  };

  const handleDecline = async (m: Message) => {
    try {
      const result = await messagesApi.decline(m.id);
      notifyUnreadCountChange(result.unreadCount);
      toast.success('Запрос отклонён');
      await fetchMessages();
      if (tab === 'deferred') await fetchDeferred();
    } catch { toast.error('Ошибка'); }
  };

  const handleDefer = async (m: Message) => {
    try {
      const result = await messagesApi.defer(m.id);
      notifyUnreadCountChange(result.unreadCount);
      toast.success('Запрос отложен');
      await fetchMessages();
    } catch { toast.error('Ошибка'); }
  };

  const newCount      = messages.length;
  const deferredCount = deferred.length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Сообщения</h1>
          <p className="text-[13.5px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {newCount > 0 ? `${newCount} новых` : 'Нет новых запросов'}
            {deferredCount > 0 && ` · ${deferredCount} отложено`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSettings(!showSettings)} className="btn btn-ghost btn-icon">
            <Settings className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
          </button>
          <button onClick={handleGenerate} disabled={generating} className="btn btn-primary">
            <Sparkles className="w-4 h-4" />
            {generating ? 'Генерация...' : 'Сгенерировать'}
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="glass-card p-4 animate-fade-in">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              Автогенерация:
            </span>
            {([
              { value: 0,  label: 'Выкл.' },
              { value: 15, label: '15 сек.' },
              { value: 30, label: '30 сек.' },
              { value: 60, label: '1 мин.' },
            ] as { value: AutoInterval; label: string }[]).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setAutoInterval(value)}
                className="btn text-[12.5px] py-1.5 px-3"
                style={{
                  background: autoInterval === value ? 'var(--accent)' : 'var(--bg-elevated)',
                  color: autoInterval === value ? '#fff' : 'var(--text-secondary)',
                  border: `1px solid ${autoInterval === value ? 'var(--accent)' : 'var(--border-base)'}`,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-1" style={{ borderBottom: '1px solid var(--glass-border)' }}>
        {[
          { id: 'inbox'    as const, label: 'Входящие',  icon: <MessageSquare className="w-4 h-4" />, count: newCount },
          { id: 'deferred' as const, label: 'Отложенные', icon: <Bookmark className="w-4 h-4" />,      count: deferredCount },
          { id: 'history'  as const, label: 'История',    icon: <History className="w-4 h-4" />,       count: null },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-4 py-2.5 text-[13.5px] font-medium transition-colors flex items-center gap-2"
            style={{
              color: tab === t.id ? 'var(--accent)' : 'var(--text-secondary)',
              borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t.icon}{t.label}
            {t.count !== null && t.count > 0 && (
              <span className="badge" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'inbox' && (
        loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="glass-card p-5 animate-pulse">
                <div className="flex gap-3 mb-4">
                  <div className="skeleton flex-shrink-0" style={{ width: 40, height: 40, borderRadius: 12 }} />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton" style={{ width: '55%', height: 16 }} />
                    <div className="skeleton" style={{ width: '35%', height: 13 }} />
                  </div>
                </div>
                <div className="skeleton w-full" style={{ height: 60 }} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <EmptyState
            icon={<MessageSquare className="w-5 h-5" />}
            title="Нет новых запросов"
            description={!hasEntities
              ? 'Создайте группу или исполнителя, чтобы получать концертные запросы'
              : 'Нажмите «Сгенерировать», чтобы получить новые предложения'}
            action={
              <button onClick={handleGenerate} disabled={generating || !hasEntities} className="btn btn-primary">
                <Sparkles className="w-4 h-4" />
                Сгенерировать запросы
              </button>
            }
          />
        ) : (
          <div className="space-y-3">
            {messages.map(m => (
              <MessageCard
                key={m.id}
                message={m}
                onAccept={setAcceptTarget}
                onDecline={handleDecline}
                onDefer={handleDefer}
              />
            ))}
          </div>
        )
      )}

      {tab === 'deferred' && (
        deferred.length === 0 ? (
          <EmptyState
            icon={<Bookmark className="w-5 h-5" />}
            title="Нет отложенных запросов"
            description="Запросы со статусом «Отложено» появятся здесь"
          />
        ) : (
          <div className="space-y-3">
            {deferred.map(m => (
              <MessageCard
                key={m.id}
                message={m}
                onAccept={setAcceptTarget}
                onDecline={handleDecline}
              />
            ))}
          </div>
        )
      )}

      {tab === 'history' && (
        <>
          <div className="flex flex-wrap gap-3 items-center">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-[200px]"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-base)' }}
            >
              <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
              <input
                className="bg-transparent outline-none text-[13.5px] flex-1"
                style={{ color: 'var(--text-primary)' }}
                placeholder="Поиск..."
                value={histSearch}
                onChange={e => setHistSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-1">
              {[
                { value: 'all',      label: 'Все' },
                { value: 'accepted', label: 'Принятые' },
                { value: 'declined', label: 'Отклонённые' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setHistFilter(value)}
                  className="btn text-[12.5px] py-1.5 px-3"
                  style={{
                    background: histFilter === value ? 'var(--accent)' : 'var(--bg-elevated)',
                    color: histFilter === value ? '#fff' : 'var(--text-secondary)',
                    border: `1px solid ${histFilter === value ? 'var(--accent)' : 'var(--border-base)'}`,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <button onClick={() => setHistSort(p => p === 'desc' ? 'asc' : 'desc')} className="btn btn-ghost btn-icon">
              {histSort === 'desc'
                ? <SortDesc className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                : <SortAsc className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              }
            </button>
            <button onClick={fetchHistory} className="btn btn-ghost btn-icon">
              <RefreshCw className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>

          {history.length === 0 ? (
            <EmptyState
              icon={<History className="w-5 h-5" />}
              title="История пуста"
              description="Здесь появятся принятые и отклонённые запросы"
            />
          ) : (
            <div className="space-y-3">
              {history.map(m => (
                <MessageCard key={m.id} message={m} showActions={false} />
              ))}
            </div>
          )}
        </>
      )}

      {acceptTarget && (
        <Modal
          title="Принять запрос"
          subtitle={`${acceptTarget.sender_name} — ${acceptTarget.organization}`}
          onClose={() => setAcceptTarget(null)}
          size="sm"
          footer={
            <div className="flex justify-end gap-3">
              <button onClick={() => setAcceptTarget(null)} className="btn btn-ghost">Отмена</button>
              <button onClick={handleAccept} className="btn btn-primary">
                <CheckCircle2 className="w-4 h-4" />
                Принять и создать тур
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="p-3 rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
              <p className="text-[13px] mb-1" style={{ color: 'var(--text-secondary)' }}>Запрос для:</p>
              {acceptTarget.band_name && (
                <div className="flex items-center gap-2 text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>
                  <Music2 className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  Группа: {acceptTarget.band_name}
                </div>
              )}
              {acceptTarget.singer_name && !acceptTarget.band_name && (
                <div className="flex items-center gap-2 text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>
                  <Mic2 className="w-4 h-4" style={{ color: '#34d399' }} />
                  Исполнитель: {acceptTarget.singer_name}
                </div>
              )}
            </div>
            {acceptTarget.proposed_date && (
              <div className="p-3 rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
                <div className="flex justify-between text-[13px]">
                  <span style={{ color: 'var(--text-secondary)' }}>Город</span>
                  <span style={{ color: 'var(--text-primary)' }}>{acceptTarget.city}</span>
                </div>
                <div className="flex justify-between text-[13px] mt-1">
                  <span style={{ color: 'var(--text-secondary)' }}>Дата</span>
                  <span style={{ color: 'var(--text-primary)' }}>
                    {new Date(acceptTarget.proposed_date).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                <div className="flex justify-between text-[13px] mt-1">
                  <span style={{ color: 'var(--text-secondary)' }}>Гонорар</span>
                  <span style={{ color: 'var(--success)' }}>
                    {acceptTarget.proposed_fee.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
